import { Redis } from '@upstash/redis';
import {
  StorageAdapter,
  StateStore,
  WeeklyCalendar,
  CompanyInfo,
  Persona,
  Keyword,
} from '../core/types';
import {
  validateCompanyInfo,
  validatePersona,
  validateKeyword,
  validateCalendar,
} from '../utils/validation';

/**
 * Upstash Redis storage adapter for production environments
 * Data persists across deployments in Vercel KV database
 */
export class KVStorageAdapter implements StorageAdapter {
  private readonly redis: Redis;
  private readonly prefix = 'ogtools:';

  constructor() {
    // Initialize Redis from environment variables
    // Requires: KV_REST_API_URL and KV_REST_API_TOKEN
    this.redis = Redis.fromEnv();
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async loadState(): Promise<StateStore> {
    const state = await this.redis.get<StateStore>(this.getKey('state'));
    
    if (!state) {
      // Return default state if not found
      return {
        currentWeek: null,
        history: { weeks: [] },
        settings: {
          autoApprove: false,
          qualityThreshold: 7.0,
          postsPerWeek: 3,
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
    }

    return this.deserializeState(state);
  }

  async saveState(state: StateStore): Promise<void> {
    await this.redis.set(this.getKey('state'), state);
  }

  async saveCalendar(calendar: WeeklyCalendar): Promise<void> {
    validateCalendar(calendar);
    
    // Serialize dates to ISO strings for storage
    const serialized = this.serializeCalendar(calendar);
    
    // Store calendar
    await this.redis.set(this.getKey(`calendar:${calendar.weekId}`), serialized);
    
    // Add to calendar list
    await this.redis.sadd(this.getKey('calendars:list'), calendar.weekId);
  }

  async loadCalendar(weekId: string): Promise<WeeklyCalendar> {
    const calendar = await this.redis.get<any>(this.getKey(`calendar:${weekId}`));
    
    if (!calendar) {
      throw new Error(`Calendar not found: ${weekId}`);
    }

    return this.deserializeCalendar(calendar);
  }

  async listCalendars(): Promise<string[]> {
    const calendars = await this.redis.smembers(this.getKey('calendars:list'));
    return (calendars as string[]).sort();
  }

  async loadCompanyInfo(): Promise<CompanyInfo> {
    const company = await this.redis.get<CompanyInfo>(this.getKey('company'));
    
    if (!company) {
      // Return default company info
      return {
        name: 'OGTools',
        tagline: 'AI-Powered Reddit Content Calendar',
        description: 'Generate authentic Reddit content with AI',
        targetAudience: 'Reddit marketers and content creators',
        subreddits: [],
      };
    }

    validateCompanyInfo(company);
    return company;
  }

  async loadPersonas(): Promise<Persona[]> {
    const personas = await this.redis.get<Persona[]>(this.getKey('personas'));
    
    if (!personas) {
      return [];
    }

    personas.forEach((persona, index) => {
      try {
        validatePersona(persona);
      } catch (error) {
        throw new Error(
          `Invalid persona at index ${index}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    });

    return personas;
  }

  async loadKeywords(): Promise<Keyword[]> {
    const keywords = await this.redis.get<Keyword[]>(this.getKey('keywords'));
    
    if (!keywords) {
      return [];
    }

    keywords.forEach((keyword, index) => {
      try {
        validateKeyword(keyword);
      } catch (error) {
        throw new Error(
          `Invalid keyword at index ${index}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    });

    return keywords;
  }

  async deleteCalendar(weekId: string): Promise<void> {
    await this.redis.del(this.getKey(`calendar:${weekId}`));
    await this.redis.srem(this.getKey('calendars:list'), weekId);
  }

  async calendarExists(weekId: string): Promise<boolean> {
    const exists = await this.redis.exists(this.getKey(`calendar:${weekId}`));
    return exists === 1;
  }

  /**
   * Serialize calendar (convert Dates to ISO strings)
   */
  private serializeCalendar(calendar: WeeklyCalendar): unknown {
    return {
      ...calendar,
      startDate: calendar.startDate.toISOString(),
      posts: calendar.posts.map((post) => ({
        ...post,
        timestamp: post.timestamp.toISOString(),
      })),
      comments: calendar.comments.map((comment) => ({
        ...comment,
        timestamp: comment.timestamp.toISOString(),
      })),
    };
  }

  /**
   * Deserialize calendar (convert ISO strings to Dates)
   */
  private deserializeCalendar(calendar: any): WeeklyCalendar {
    return {
      ...calendar,
      startDate: new Date(calendar.startDate),
      posts: calendar.posts.map((post: any) => ({
        ...post,
        timestamp: new Date(post.timestamp),
      })),
      comments: calendar.comments.map((comment: any) => ({
        ...comment,
        timestamp: new Date(comment.timestamp),
      })),
    };
  }

  /**
   * Deserialize state (ensure proper types and structure)
   */
  private deserializeState(state: any): StateStore {
    // Start with default structure
    const defaultState: StateStore = {
      currentWeek: null,
      history: { weeks: [], totalPosts: 0, totalComments: 0 },
      settings: {
        autoApprove: false,
        qualityThreshold: 7.0,
        postsPerWeek: 3,
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

    // Merge stored state with defaults (stored state takes precedence)
    return {
      ...defaultState,
      ...state,
      history: {
        ...defaultState.history,
        ...state.history,
        weeks: (state.history?.weeks || []).map((week: any) =>
          this.deserializeCalendar(week)
        ),
      },
      settings: {
        ...defaultState.settings,
        ...state.settings,
      },
      quotas: {
        personaUsage: state.quotas?.personaUsage || {},
        subredditUsage: state.quotas?.subredditUsage || {},
        keywordUsage: state.quotas?.keywordUsage || {},
      },
      patterns: {
        personaPairings: state.patterns?.personaPairings || {},
        subredditRotation: state.patterns?.subredditRotation || [],
        timingPatterns: state.patterns?.timingPatterns || [],
      },
      qualityMetrics: {
        ...defaultState.qualityMetrics,
        ...state.qualityMetrics,
      },
    };
  }

  /**
   * Seed initial data (useful for setup)
   */
  async seedData(data: {
    company?: CompanyInfo;
    personas?: Persona[];
    keywords?: Keyword[];
  }): Promise<void> {
    if (data.company) {
      validateCompanyInfo(data.company);
      await this.redis.set(this.getKey('company'), data.company);
    }
    
    if (data.personas) {
      data.personas.forEach(validatePersona);
      await this.redis.set(this.getKey('personas'), data.personas);
    }
    
    if (data.keywords) {
      data.keywords.forEach(validateKeyword);
      await this.redis.set(this.getKey('keywords'), data.keywords);
    }
  }
}

// Export singleton instance
export const kvStorage = new KVStorageAdapter();
