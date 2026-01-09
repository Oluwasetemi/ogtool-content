import { promises as fs } from 'fs';
import path from 'path';
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
 * JSON file-based storage adapter
 * Stores data in app/data directory
 */
export class JSONStorageAdapter implements StorageAdapter {
  private dataDir: string;

  constructor(dataDir?: string) {
    // Default to app/data directory
    this.dataDir =
      dataDir || path.join(process.cwd(), 'data');
  }

  /**
   * Ensure data directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const calendarsDir = path.join(this.dataDir, 'calendars');
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(calendarsDir, { recursive: true });
  }

  /**
   * Load JSON file with error handling
   */
  private async loadJSON<T>(filePath: string): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(
        `Failed to load ${filePath}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Save JSON file with atomic write (write to temp, then rename)
   */
  private async saveJSON<T>(filePath: string, data: T): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    try {
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(
        `Failed to save ${filePath}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Load state from state.json
   */
  async loadState(): Promise<StateStore> {
    const statePath = path.join(this.dataDir, 'state.json');
    const state = await this.loadJSON<StateStore>(statePath);

    // Convert timestamp strings back to numbers if needed
    // (JSON doesn't distinguish between number and string for timestamps)
    return this.deserializeState(state);
  }

  /**
   * Save state to state.json
   */
  async saveState(state: StateStore): Promise<void> {
    await this.ensureDirectories();
    const statePath = path.join(this.dataDir, 'state.json');
    await this.saveJSON(statePath, state);
  }

  /**
   * Save calendar to calendars/week-*.json
   */
  async saveCalendar(calendar: WeeklyCalendar): Promise<void> {
    await this.ensureDirectories();
    validateCalendar(calendar);

    const calendarPath = path.join(
      this.dataDir,
      'calendars',
      `${calendar.weekId}.json`
    );

    // Serialize dates to ISO strings
    const serialized = this.serializeCalendar(calendar);
    await this.saveJSON(calendarPath, serialized);
  }

  /**
   * Load calendar from calendars/week-*.json
   */
  async loadCalendar(weekId: string): Promise<WeeklyCalendar> {
    const calendarPath = path.join(this.dataDir, 'calendars', `${weekId}.json`);
    const calendar = await this.loadJSON<WeeklyCalendar>(calendarPath);

    // Deserialize ISO strings back to Dates
    return this.deserializeCalendar(calendar);
  }

  /**
   * List all calendar week IDs
   */
  async listCalendars(): Promise<string[]> {
    const calendarsDir = path.join(this.dataDir, 'calendars');

    try {
      const files = await fs.readdir(calendarsDir);
      return files
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace('.json', ''))
        .sort();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Load company info from company.json
   */
  async loadCompanyInfo(): Promise<CompanyInfo> {
    const companyPath = path.join(this.dataDir, 'company.json');
    const company = await this.loadJSON<CompanyInfo>(companyPath);
    validateCompanyInfo(company);
    return company;
  }

  /**
   * Load personas from personas.json
   */
  async loadPersonas(): Promise<Persona[]> {
    const personasPath = path.join(this.dataDir, 'personas.json');
    const personas = await this.loadJSON<Persona[]>(personasPath);

    // Validate each persona
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

  /**
   * Load keywords from keywords.json
   */
  async loadKeywords(): Promise<Keyword[]> {
    const keywordsPath = path.join(this.dataDir, 'keywords.json');
    const keywords = await this.loadJSON<Keyword[]>(keywordsPath);

    // Validate each keyword
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
  private deserializeCalendar(calendar: WeeklyCalendar & { startDate: string | Date }): WeeklyCalendar {
    return {
      ...calendar,
      startDate: new Date(calendar.startDate),
      posts: calendar.posts.map((post) => ({
        ...post,
        timestamp: new Date((post.timestamp as unknown) as string),
      })),
      comments: calendar.comments.map((comment) => ({
        ...comment,
        timestamp: new Date((comment.timestamp as unknown) as string),
      })),
    };
  }

  /**
   * Deserialize state (ensure proper types)
   */
  private deserializeState(state: StateStore & { history?: { weeks?: Array<{ startDate: string | Date }> } }): StateStore {
    return {
      ...state,
      history: {
        ...state.history,
        weeks: (state.history?.weeks || []).map((week) =>
          this.deserializeCalendar(week as WeeklyCalendar & { startDate: string | Date })
        ),
      },
    };
  }

  /**
   * Delete a calendar
   */
  async deleteCalendar(weekId: string): Promise<void> {
    const calendarPath = path.join(this.dataDir, 'calendars', `${weekId}.json`);
    await fs.unlink(calendarPath);
  }

  /**
   * Check if a calendar exists
   */
  async calendarExists(weekId: string): Promise<boolean> {
    const calendarPath = path.join(this.dataDir, 'calendars', `${weekId}.json`);
    try {
      await fs.access(calendarPath);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const jsonStorage = new JSONStorageAdapter();
