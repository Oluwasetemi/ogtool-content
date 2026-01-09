import {
  GenerationParams,
  StateStore,
  Post,
  SelectedSubreddit,
  PersonaAssignment,
  TopicPlan,
  PostDraft,
  Persona,
  PainPoint,
  Keyword,
  SubredditQuota,
} from '../core/types';
import {
  SUBREDDIT_SELECTION_WEIGHTS,
  PERSONA_ASSIGNMENT_WEIGHTS,
  KEYWORD_INTEGRATION_WEIGHTS,
  RECENCY_PENALTY_THRESHOLDS,
  RECENCY_PENALTIES,
  FREQUENCY_PENALTY_THRESHOLDS,
  FREQUENCY_PENALTIES,
  SUBREDDIT_CULTURE_MAP,
  TOPIC_FORMATS,
} from '../core/constants';
import { weightedRandomSelect, randomInt, generateId, shuffle } from '../utils/random';
import { cosineSimilarity, findSimilarTopics } from '../utils/similarity';

/**
 * Post Engine - Generate posts with subreddit selection, persona assignment,
 * topic generation, and keyword integration
 */

// ============================================================================
// Main Post Generation
// ============================================================================

export async function generatePosts(
  params: GenerationParams,
  state: StateStore
): Promise<Post[]> {
  const { companyInfo, personas, subreddits, keywords, postsPerWeek } = params;

  // Phase 1: Select subreddits
  const selectedSubreddits = selectSubreddits(subreddits, state, postsPerWeek);

  // Phase 2: Assign personas to subreddits
  const assignments = assignPersonasToSubreddits(selectedSubreddits, personas, state);

  // Phase 3: Generate topics
  const topics = generateTopics(assignments, state);

  // Phase 4: Integrate keywords
  const drafts = integrateKeywords(topics, keywords, state);

  // Phase 5: Create post objects (text generation happens later in AI module)
  const posts = drafts.map((draft, index) => createPostFromDraft(draft, index + 1));

  return posts;
}

// ============================================================================
// Subreddit Selection
// ============================================================================

export function selectSubreddits(
  subreddits: string[],
  state: StateStore,
  count: number
): SelectedSubreddit[] {
  const scored = subreddits.map((sub) => {
    const usage = state.quotas.subredditUsage[sub] || {
      postCount: [],
      lastPosted: 0,
      topicsUsed: [],
    };

    // Calculate score components
    const recencyPenalty = calculateRecencyPenalty(usage.lastPosted);
    const frequencyPenalty = calculateFrequencyPenalty(usage.postCount);
    const diversityBonus = calculateDiversityBonus(sub, state.patterns.subredditRotation);
    const cultureMatch = calculateCultureMatch(sub);

    const score =
      cultureMatch * SUBREDDIT_SELECTION_WEIGHTS.cultureMatch +
      diversityBonus * SUBREDDIT_SELECTION_WEIGHTS.diversityBonus -
      recencyPenalty * SUBREDDIT_SELECTION_WEIGHTS.recencyPenalty -
      frequencyPenalty * SUBREDDIT_SELECTION_WEIGHTS.frequencyPenalty;

    return {
      subreddit: sub,
      score,
      usage,
    };
  });

  // Sort by score and select top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

function calculateRecencyPenalty(lastPosted: number): number {
  if (lastPosted === 0) return RECENCY_PENALTIES.none;

  const daysSince = (Date.now() - lastPosted) / (1000 * 60 * 60 * 24);

  if (daysSince < RECENCY_PENALTY_THRESHOLDS.critical) {
    return RECENCY_PENALTIES.critical;
  }
  if (daysSince < RECENCY_PENALTY_THRESHOLDS.high) {
    return RECENCY_PENALTIES.high;
  }
  if (daysSince < RECENCY_PENALTY_THRESHOLDS.medium) {
    return RECENCY_PENALTIES.medium;
  }

  return RECENCY_PENALTIES.none;
}

function calculateFrequencyPenalty(postCount: number[]): number {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentPosts = postCount.filter((ts) => ts > thirtyDaysAgo);

  if (recentPosts.length >= FREQUENCY_PENALTY_THRESHOLDS.excessive) {
    return FREQUENCY_PENALTIES.excessive;
  }
  if (recentPosts.length >= FREQUENCY_PENALTY_THRESHOLDS.high) {
    return FREQUENCY_PENALTIES.high;
  }

  return FREQUENCY_PENALTIES.none;
}

function calculateDiversityBonus(subreddit: string, recentRotation: string[]): number {
  const lastFive = recentRotation.slice(-5);
  const occurrences = lastFive.filter((s) => s === subreddit).length;

  if (occurrences === 0) return 1.0;
  if (occurrences === 1) return 0.3;
  return 0;
}

function calculateCultureMatch(subreddit: string): number {
  const culture = SUBREDDIT_CULTURE_MAP[subreddit];
  if (!culture) return 0.5; // Default for unmapped subreddits

  // Base score from activity level
  return culture.activityLevel * 0.7 + Math.random() * 0.3;
}

// ============================================================================
// Persona Assignment
// ============================================================================

export function assignPersonasToSubreddits(
  selectedSubreddits: SelectedSubreddit[],
  personas: Persona[],
  state: StateStore
): PersonaAssignment[] {
  return selectedSubreddits.map((subSelection) => {
    const scored = personas.map((persona) => {
      const usage = state.quotas.personaUsage[persona.username] || {
        postsAsOP: [],
        postsAsCommenter: [],
        lastUsed: 0,
        consecutiveWeeks: 0,
      };

      // Calculate score components
      const authenticity = calculateAuthenticityScore(persona, subSelection.subreddit);
      const restBonus = calculateRestBonus(usage);
      const varietyBonus = calculateVarietyBonus(persona, state);

      const score =
        authenticity * PERSONA_ASSIGNMENT_WEIGHTS.authenticity +
        restBonus * PERSONA_ASSIGNMENT_WEIGHTS.restBonus +
        varietyBonus * PERSONA_ASSIGNMENT_WEIGHTS.varietyBonus;

      return { persona, score };
    });

    // Select highest scoring persona
    const selected = scored.sort((a, b) => b.score - a.score)[0];

    return {
      subreddit: subSelection.subreddit,
      persona: selected.persona,
      authenticityScore: calculateAuthenticityScore(selected.persona, subSelection.subreddit),
    };
  });
}

function calculateAuthenticityScore(persona: Persona, subreddit: string): number {
  // Use authenticity mapping from persona voice profile
  return persona.voiceProfile.authenticity[subreddit] || 0.5;
}

function calculateRestBonus(usage: { lastUsed: number; consecutiveWeeks: number }): number {
  const daysSinceLastUse = (Date.now() - usage.lastUsed) / (1000 * 60 * 60 * 24);

  // Bonus for resting personas
  if (daysSinceLastUse >= 14) return 1.0;
  if (daysSinceLastUse >= 7) return 0.6;
  if (daysSinceLastUse >= 3) return 0.3;

  // Penalty for consecutive weeks
  if (usage.consecutiveWeeks >= 3) return -0.3;

  return 0;
}

function calculateVarietyBonus(persona: Persona, state: StateStore): number {
  const recentWeeks = state.history.weeks.slice(-3);
  const recentUsage = recentWeeks.flatMap((w) =>
    w.posts.map((p) => p.author_username)
  );

  const usageCount = recentUsage.filter((u) => u === persona.username).length;

  // Bonus for personas not used recently
  if (usageCount === 0) return 0.5;
  if (usageCount === 1) return 0.2;
  return 0;
}

// ============================================================================
// Topic Generation
// ============================================================================

export function generateTopics(
  assignments: PersonaAssignment[],
  state: StateStore
): TopicPlan[] {
  return assignments.map((assignment) => {
    const { persona, subreddit } = assignment;

    // Extract pain points from persona
    const painPoints = extractPainPoints(persona);

    // Filter for subreddit relevance
    const relevantPainPoints = painPoints.filter((pp) =>
      isRelevantToSubreddit(pp, subreddit)
    );

    // Avoid topic overlap with previous weeks
    const usedTopics = state.quotas.subredditUsage[subreddit]?.topicsUsed || [];
    const freshPainPoint = selectFreshPainPoint(relevantPainPoints, usedTopics);

    // Select topic format
    const format = selectTopicFormat(state);

    return {
      persona,
      subreddit,
      painPoint: freshPainPoint,
      format,
      intent: format.type as TopicPlan['intent'],
    };
  });
}

function extractPainPoints(persona: Persona): PainPoint[] {
  // Use the painPoints array from persona data
  return persona.painPoints.map((text, index) => ({
    text,
    keywords: extractKeywordsFromText(text),
    intensity: 0.7 + index * 0.05, // Vary intensity slightly
  }));
}

function extractKeywordsFromText(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  // Extract meaningful words (longer than 4 characters)
  return words.filter((word) => word.length > 4);
}

function isRelevantToSubreddit(painPoint: PainPoint, subreddit: string): boolean {
  const culture = SUBREDDIT_CULTURE_MAP[subreddit];
  if (!culture) return true; // Accept all if unmapped

  // Check if pain point keywords match subreddit segments
  const relevantTerms = ['presentation', 'slides', 'deck', 'design', 'format', 'visual'];

  return painPoint.keywords.some((kw) =>
    relevantTerms.some((term) => kw.includes(term))
  );
}

function selectFreshPainPoint(
  painPoints: PainPoint[],
  usedTopics: string[]
): PainPoint {
  // Find pain point that's not similar to used topics
  for (const pp of shuffle(painPoints)) {
    const similar = findSimilarTopics(pp.text, usedTopics, 0.7);
    if (similar.length === 0) {
      return pp;
    }
  }

  // If all are similar, return random one (shouldn't happen often)
  return painPoints[randomInt(0, painPoints.length - 1)];
}

function selectTopicFormat(state: StateStore): TopicPlan['format'] {
  // Get recent formats to avoid repetition
  const recentFormats = state.history.weeks
    .slice(-3)
    .flatMap((w) => w.posts.map((p) => p.metadata.intent));

  // Convert formats to weighted options
  const options = TOPIC_FORMATS.map((format) => ({
    value: format,
    weight: format.weight,
  }));

  return weightedRandomSelect(options);
}

// ============================================================================
// Keyword Integration
// ============================================================================

export function integrateKeywords(
  topics: TopicPlan[],
  keywords: Keyword[],
  state: StateStore
): PostDraft[] {
  return topics.map((topic) => {
    // Score keywords for this topic
    const scored = keywords.map((keyword) => {
      const relevance = calculateKeywordRelevance(keyword, topic);
      const usage = state.quotas.keywordUsage[keyword.id] || {
        usageCount: 0,
        lastUsed: 0,
        contexts: [],
      };
      const freshness = calculateKeywordFreshness(usage);

      const score =
        relevance * KEYWORD_INTEGRATION_WEIGHTS.relevance +
        freshness * KEYWORD_INTEGRATION_WEIGHTS.freshness;

      return { keyword, score };
    });

    // Select 1-3 keywords per post
    const numKeywords = randomInt(1, 3);
    const selectedKeywords = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, numKeywords)
      .map((sk) => sk.keyword);

    return {
      ...topic,
      keywords: selectedKeywords,
      primaryKeyword: selectedKeywords[0],
    };
  });
}

function calculateKeywordRelevance(keyword: Keyword, topic: TopicPlan): number {
  const { semantics } = keyword;
  const topicText = topic.painPoint.text.toLowerCase();
  const formatType = topic.format.type;

  let score = 0.3; // Base score

  // Match intent
  if (formatType === 'comparison_question' && semantics.intent === 'comparison') {
    score += 0.4;
  } else if (formatType === 'direct_question' && semantics.intent === 'recommendation') {
    score += 0.4;
  } else if (semantics.intent === 'assistance' || semantics.intent === 'efficiency') {
    score += 0.2;
  }

  // Term overlap with pain point
  const overlap = semantics.terms.filter((term) => topicText.includes(term)).length;
  score += overlap * 0.1;

  return Math.min(score, 1.0);
}

function calculateKeywordFreshness(usage: {
  usageCount: number;
  lastUsed: number;
}): number {
  const { usageCount, lastUsed } = usage;

  // Penalty for overuse
  if (usageCount >= 5) return 0.2;
  if (usageCount >= 3) return 0.5;

  // Bonus for not used recently
  const daysSince = (Date.now() - lastUsed) / (1000 * 60 * 60 * 24);
  if (daysSince >= 14 || lastUsed === 0) return 1.0;
  if (daysSince >= 7) return 0.7;

  return 0.5;
}

// ============================================================================
// Post Creation
// ============================================================================

function createPostFromDraft(draft: PostDraft, index: number): Post {
  const { persona, subreddit, primaryKeyword, keywords } = draft;

  // Generate post ID
  const postId = generateId('P', index);

  // Create post object (text will be generated by AI module)
  return {
    post_id: postId,
    subreddit,
    title: '', // Filled by AI text generator
    body: '', // Filled by AI text generator
    author_username: persona.username,
    timestamp: new Date(), // Will be adjusted by timing module
    keyword_ids: keywords.map((k) => k.id),
    metadata: {
      topic: draft.painPoint.text,
      intent: draft.intent,
      targetEngagement: randomInt(2, 4),
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a persona should be avoided (burned out)
 */
export function shouldAvoidPersona(
  persona: Persona,
  state: StateStore
): boolean {
  const usage = state.quotas.personaUsage[persona.username];
  if (!usage) return false;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentPostsAsOP = usage.postsAsOP.filter((ts) => ts > thirtyDaysAgo).length;
  const recentComments = usage.postsAsCommenter.filter((ts) => ts > thirtyDaysAgo).length;

  return (
    recentPostsAsOP >= 10 ||
    recentComments >= 20 ||
    usage.consecutiveWeeks >= 5
  );
}

/**
 * Get available subreddits (not recently posted to)
 */
export function getAvailableSubreddits(
  subreddits: string[],
  state: StateStore
): string[] {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return subreddits.filter((sub) => {
    const usage = state.quotas.subredditUsage[sub];
    if (!usage) return true;

    return usage.lastPosted < sevenDaysAgo;
  });
}
