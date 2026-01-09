import { StateStore, WeeklyCalendar, PersonaQuota, SubredditQuota, KeywordQuota } from '../core/types';
import { STATE_RETENTION } from '../core/constants';
import { storage } from './storage-factory';

/**
 * State Manager - Handle all state operations
 * Manages quotas, history, and patterns across weeks
 */
export class StateManager {
  private state: StateStore | null = null;

  /**
   * Load state from storage
   */
  async loadState(): Promise<StateStore> {
    this.state = await storage.loadState();
    return this.state;
  }

  /**
   * Save state to storage
   */
  async saveState(state?: StateStore): Promise<void> {
    const stateToSave = state || this.state;
    if (!stateToSave) {
      throw new Error('No state to save');
    }
    await storage.saveState(stateToSave);
    this.state = stateToSave;
  }

  /**
   * Get current state (load if not already loaded)
   */
  async getState(): Promise<StateStore> {
    if (!this.state) {
      return await this.loadState();
    }
    return this.state;
  }

  /**
   * Update state after generating a calendar
   */
  async updateStateWithCalendar(calendar: WeeklyCalendar): Promise<StateStore> {
    const state = await this.getState();

    // Update history
    state.history.weeks.push(calendar);
    state.history.totalPosts += calendar.posts.length;
    state.history.totalComments += calendar.comments.length;

    // Update persona quotas
    this.updatePersonaQuotas(state, calendar);

    // Update subreddit quotas
    this.updateSubredditQuotas(state, calendar);

    // Update keyword quotas
    this.updateKeywordQuotas(state, calendar);

    // Update patterns
    this.updatePatterns(state, calendar);

    // Update quality metrics
    this.updateQualityMetrics(state, calendar);

    // Prune old data
    this.pruneOldData(state);

    // Save updated state
    await this.saveState(state);

    return state;
  }

  /**
   * Update persona usage quotas
   */
  private updatePersonaQuotas(state: StateStore, calendar: WeeklyCalendar): void {
    // Track posts as OP
    calendar.posts.forEach((post) => {
      const username = post.author_username;
      const quota = this.getOrCreatePersonaQuota(state, username);

      quota.postsAsOP.push(post.timestamp.getTime());
      quota.lastUsed = Math.max(quota.lastUsed, post.timestamp.getTime());
    });

    // Track comments
    calendar.comments.forEach((comment) => {
      const username = comment.username;
      const quota = this.getOrCreatePersonaQuota(state, username);

      quota.postsAsCommenter.push(comment.timestamp.getTime());
      quota.lastUsed = Math.max(quota.lastUsed, comment.timestamp.getTime());
    });

    // Update consecutive weeks for personas who were used
    const usedPersonas = new Set([
      ...calendar.posts.map((p) => p.author_username),
      ...calendar.comments.map((c) => c.username),
    ]);

    Object.keys(state.quotas.personaUsage).forEach((username) => {
      if (usedPersonas.has(username)) {
        state.quotas.personaUsage[username].consecutiveWeeks++;
      } else {
        state.quotas.personaUsage[username].consecutiveWeeks = 0;
      }
    });
  }

  /**
   * Update subreddit usage quotas
   */
  private updateSubredditQuotas(state: StateStore, calendar: WeeklyCalendar): void {
    calendar.posts.forEach((post) => {
      const subreddit = post.subreddit;
      const quota = this.getOrCreateSubredditQuota(state, subreddit);

      quota.postCount.push(post.timestamp.getTime());
      quota.lastPosted = Math.max(quota.lastPosted, post.timestamp.getTime());
      quota.topicsUsed.push(post.metadata.topic);
    });
  }

  /**
   * Update keyword usage quotas
   */
  private updateKeywordQuotas(state: StateStore, calendar: WeeklyCalendar): void {
    calendar.posts.forEach((post) => {
      post.keyword_ids.forEach((keywordId) => {
        const quota = this.getOrCreateKeywordQuota(state, keywordId);

        quota.usageCount++;
        quota.lastUsed = Math.max(quota.lastUsed, post.timestamp.getTime());
        quota.contexts.push(post.title);
      });
    });
  }

  /**
   * Update pattern tracking
   */
  private updatePatterns(state: StateStore, calendar: WeeklyCalendar): void {
    // Track persona pairings
    calendar.posts.forEach((post) => {
      const postComments = calendar.comments.filter((c) => c.post_id === post.post_id);

      postComments.forEach((comment) => {
        if (comment.username !== post.author_username) {
          const pair = [post.author_username, comment.username].sort().join('+');
          state.patterns.personaPairings[pair] =
            (state.patterns.personaPairings[pair] || 0) + 1;
        }
      });
    });

    // Track subreddit rotation
    calendar.posts.forEach((post) => {
      state.patterns.subredditRotation.push(post.subreddit);
    });

    // Track timing patterns (comment gaps)
    calendar.posts.forEach((post) => {
      const postComments = calendar.comments
        .filter((c) => c.post_id === post.post_id)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      for (let i = 1; i < postComments.length; i++) {
        const gapMinutes =
          (postComments[i].timestamp.getTime() - postComments[i - 1].timestamp.getTime()) /
          (1000 * 60);
        state.patterns.timingPatterns.push(gapMinutes);
      }
    });
  }

  /**
   * Update quality metrics
   */
  private updateQualityMetrics(state: StateStore, calendar: WeeklyCalendar): void {
    const { qualityScore } = calendar;

    // Add weekly score
    state.qualityMetrics.weeklyScores.push(qualityScore.overall);

    // Update running averages
    const totalWeeks = state.history.weeks.length;

    state.qualityMetrics.averageNaturalnessScore =
      (state.qualityMetrics.averageNaturalnessScore * (totalWeeks - 1) +
        qualityScore.naturalness) /
      totalWeeks;

    state.qualityMetrics.averagePersonaConsistency =
      (state.qualityMetrics.averagePersonaConsistency * (totalWeeks - 1) +
        qualityScore.consistency) /
      totalWeeks;

    state.qualityMetrics.averageDistributionBalance =
      (state.qualityMetrics.averageDistributionBalance * (totalWeeks - 1) +
        qualityScore.distribution) /
      totalWeeks;
  }

  /**
   * Prune old data to keep state manageable
   */
  private pruneOldData(state: StateStore): void {
    // Keep only last N weeks in history
    if (state.history.weeks.length > STATE_RETENTION.pruneThreshold) {
      state.history.weeks = state.history.weeks.slice(-STATE_RETENTION.maxWeeksInHistory);
    }

    // Prune old timestamps from persona quotas (keep last 60 days)
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

    Object.values(state.quotas.personaUsage).forEach((quota) => {
      quota.postsAsOP = quota.postsAsOP.filter((ts) => ts > sixtyDaysAgo);
      quota.postsAsCommenter = quota.postsAsCommenter.filter((ts) => ts > sixtyDaysAgo);
    });

    // Prune old timestamps from subreddit quotas
    Object.values(state.quotas.subredditUsage).forEach((quota) => {
      quota.postCount = quota.postCount.filter((ts) => ts > sixtyDaysAgo);
      // Keep only last 10 topics per subreddit
      if (quota.topicsUsed.length > 10) {
        quota.topicsUsed = quota.topicsUsed.slice(-10);
      }
    });

    // Prune old keyword contexts (keep last 20)
    Object.values(state.quotas.keywordUsage).forEach((quota) => {
      if (quota.contexts.length > 20) {
        quota.contexts = quota.contexts.slice(-20);
      }
    });

    // Prune subreddit rotation (keep last 50)
    if (state.patterns.subredditRotation.length > 50) {
      state.patterns.subredditRotation = state.patterns.subredditRotation.slice(-50);
    }

    // Prune timing patterns (keep last 100)
    if (state.patterns.timingPatterns.length > 100) {
      state.patterns.timingPatterns = state.patterns.timingPatterns.slice(-100);
    }
  }

  /**
   * Get or create persona quota
   */
  private getOrCreatePersonaQuota(state: StateStore, username: string): PersonaQuota {
    if (!state.quotas.personaUsage[username]) {
      state.quotas.personaUsage[username] = {
        postsAsOP: [],
        postsAsCommenter: [],
        lastUsed: 0,
        consecutiveWeeks: 0,
      };
    }
    return state.quotas.personaUsage[username];
  }

  /**
   * Get or create subreddit quota
   */
  private getOrCreateSubredditQuota(state: StateStore, subreddit: string): SubredditQuota {
    if (!state.quotas.subredditUsage[subreddit]) {
      state.quotas.subredditUsage[subreddit] = {
        postCount: [],
        lastPosted: 0,
        topicsUsed: [],
      };
    }
    return state.quotas.subredditUsage[subreddit];
  }

  /**
   * Get or create keyword quota
   */
  private getOrCreateKeywordQuota(state: StateStore, keywordId: string): KeywordQuota {
    if (!state.quotas.keywordUsage[keywordId]) {
      state.quotas.keywordUsage[keywordId] = {
        usageCount: 0,
        lastUsed: 0,
        contexts: [],
      };
    }
    return state.quotas.keywordUsage[keywordId];
  }

  /**
   * Get persona usage in last N days
   */
  async getPersonaUsageInDays(username: string, days: number): Promise<{
    postsAsOP: number;
    postsAsCommenter: number;
  }> {
    const state = await this.getState();
    const quota = state.quotas.personaUsage[username];

    if (!quota) {
      return { postsAsOP: 0, postsAsCommenter: 0 };
    }

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    return {
      postsAsOP: quota.postsAsOP.filter((ts) => ts > cutoff).length,
      postsAsCommenter: quota.postsAsCommenter.filter((ts) => ts > cutoff).length,
    };
  }

  /**
   * Get subreddit usage in last N days
   */
  async getSubredditUsageInDays(subreddit: string, days: number): Promise<number> {
    const state = await this.getState();
    const quota = state.quotas.subredditUsage[subreddit];

    if (!quota) {
      return 0;
    }

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return quota.postCount.filter((ts) => ts > cutoff).length;
  }

  /**
   * Check if persona is burned out
   */
  async isPersonaBurnedOut(username: string): Promise<boolean> {
    const usage = await this.getPersonaUsageInDays(username, 30);
    const state = await this.getState();
    const quota = state.quotas.personaUsage[username];

    if (!quota) {
      return false;
    }

    // Check burnout thresholds
    const { postsAsOP, postsAsCommenter } = usage;
    const { consecutiveWeeks } = quota;

    return (
      postsAsOP >= 10 || postsAsCommenter >= 20 || consecutiveWeeks >= 5
    );
  }

  /**
   * Reset state (for testing)
   */
  async resetState(): Promise<void> {
    const emptyState: StateStore = {
      history: {
        weeks: [],
        totalPosts: 0,
        totalComments: 0,
      },
      quotas: {
        personaUsage: {},
        subredditUsage: {},
        keywordUsage: {},
      },
      patterns: {
        personaPairings: {},
        subredditRotation: [],
        timingPatterns: [],
      },
      qualityMetrics: {
        averageNaturalnessScore: 0,
        averagePersonaConsistency: 0,
        averageDistributionBalance: 0,
        weeklyScores: [],
      },
    };

    await this.saveState(emptyState);
  }
}

// Export singleton instance
export const stateManager = new StateManager();
