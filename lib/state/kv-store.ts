import { kv } from '@vercel/kv';
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
 * Vercel KV (Redis) storage adapter for production environments
 * Data persists across deployments in Vercel KV database
 */
export class KVStorageAdapter implements StorageAdapter {
  private readonly prefix = 'ogtools:';

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async loadState(): Promise<StateStore> {
    const state = await kv.get<StateStore>(this.getKey('state'));
    
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
    await kv.set(this.getKey('state'), state);
  }

  async saveCalendar(calendar: WeeklyCalendar): Promise<void> {
    validateCalendar(calendar);
    
    // Serialize dates to ISO strings for storage
    const serialized = this.serializeCalendar(calendar);
    
    // Store calendar
    await kv.set(this.getKey(`calendar:${calendar.weekId}`), serialized);
    
    // Add to calendar list
    await kv.sadd(this.getKey('calendars:list'), calendar.weekId);
  }

  async loadCalendar(weekId: string): Promise<WeeklyCalendar> {
    const calendar = await kv.get<any>(this.getKey(`calendar:${weekId}`));
    
    if (!calendar) {
      throw new Error(`Calendar not found: ${weekId}`);
    }

    return this.deserializeCalendar(calendar);
  }

  async listCalendars(): Promise<string[]> {
    const calendars = await kv.smembers(this.getKey('calendars:list'));
    return (calendars as string[]).sort();
  }

  async loadCompanyInfo(): Promise<CompanyInfo> {
    const company = await kv.get<CompanyInfo>(this.getKey('company'));
    
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
    const personas = await kv.get<Persona[]>(this.getKey('personas'));
    
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
    const keywords = await kv.get<Keyword[]>(this.getKey('keywords'));
    
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
    await kv.del(this.getKey(`calendar:${weekId}`));
    await kv.srem(this.getKey('calendars:list'), weekId);
  }

  async calendarExists(weekId: string): Promise<boolean> {
    const exists = await kv.exists(this.getKey(`calendar:${weekId}`));
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
   * Deserialize state (ensure proper types)
   */
  private deserializeState(state: any): StateStore {
    return {
      ...state,
      history: {
        ...state.history,
        weeks: (state.history?.weeks || []).map((week: any) =>
          this.deserializeCalendar(week)
        ),
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
      await kv.set(this.getKey('company'), data.company);
    }
    
    if (data.personas) {
      data.personas.forEach(validatePersona);
      await kv.set(this.getKey('personas'), data.personas);
    }
    
    if (data.keywords) {
      data.keywords.forEach(validateKeyword);
      await kv.set(this.getKey('keywords'), data.keywords);
    }
  }
}

// Export singleton instance
export const kvStorage = new KVStorageAdapter();
