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
 * In-memory storage adapter for serverless environments
 * Note: Data is lost on each deployment/restart
 * For production, consider using a database like Vercel KV, Postgres, or MongoDB
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private calendars: Map<string, WeeklyCalendar> = new Map();
  private state: StateStore | null = null;
  private company: CompanyInfo | null = null;
  private personas: Persona[] = [];
  private keywords: Keyword[] = [];

  constructor() {
    // Initialize with default data
    this.initializeDefaults();
  }

  private async initializeDefaults() {
    // Load default data from static files if available
    // This runs once when the adapter is created
    try {
      // In production, you would load these from environment variables or a database
      // For now, we'll use empty defaults
      this.state = {
        currentWeek: null,
        history: { weeks: [] },
        settings: {
          autoApprove: false,
          qualityThreshold: 7.0,
          postsPerWeek: 3,
        },
      };
    } catch (error) {
      console.error('Failed to initialize defaults:', error);
    }
  }

  async loadState(): Promise<StateStore> {
    if (!this.state) {
      throw new Error('State not initialized');
    }
    return this.state;
  }

  async saveState(state: StateStore): Promise<void> {
    this.state = state;
  }

  async saveCalendar(calendar: WeeklyCalendar): Promise<void> {
    validateCalendar(calendar);
    this.calendars.set(calendar.weekId, calendar);
  }

  async loadCalendar(weekId: string): Promise<WeeklyCalendar> {
    const calendar = this.calendars.get(weekId);
    if (!calendar) {
      throw new Error(`Calendar not found: ${weekId}`);
    }
    return calendar;
  }

  async listCalendars(): Promise<string[]> {
    return Array.from(this.calendars.keys()).sort();
  }

  async loadCompanyInfo(): Promise<CompanyInfo> {
    if (!this.company) {
      // Return default company info for production
      this.company = {
        name: 'OGTools',
        tagline: 'AI-Powered Reddit Content Calendar',
        description: 'Generate authentic Reddit content with AI',
        targetAudience: 'Reddit marketers and content creators',
        subreddits: [],
      };
    }
    return this.company;
  }

  async loadPersonas(): Promise<Persona[]> {
    return this.personas;
  }

  async loadKeywords(): Promise<Keyword[]> {
    return this.keywords;
  }

  async deleteCalendar(weekId: string): Promise<void> {
    this.calendars.delete(weekId);
  }

  async calendarExists(weekId: string): Promise<boolean> {
    return this.calendars.has(weekId);
  }

  // Helper method to seed data (useful for development)
  seedData(data: {
    company?: CompanyInfo;
    personas?: Persona[];
    keywords?: Keyword[];
    calendars?: WeeklyCalendar[];
  }) {
    if (data.company) {
      validateCompanyInfo(data.company);
      this.company = data.company;
    }
    if (data.personas) {
      data.personas.forEach(validatePersona);
      this.personas = data.personas;
    }
    if (data.keywords) {
      data.keywords.forEach(validateKeyword);
      this.keywords = data.keywords;
    }
    if (data.calendars) {
      data.calendars.forEach((calendar) => {
        validateCalendar(calendar);
        this.calendars.set(calendar.weekId, calendar);
      });
    }
  }
}

// Export singleton instance
export const memoryStorage = new MemoryStorageAdapter();
