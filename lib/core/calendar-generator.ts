import {
  GenerationParams,
  StateStore,
  WeeklyCalendar,
  Post,
  CalendarGenerationError,
} from './types';
import { ALGORITHM_CONFIG } from './constants';
import { generateWeekId } from '../utils/random';
import { generatePosts } from '../engines/post-engine';
import { generateComments } from '../engines/comment-engine';
import { distributePostsTemporally } from '../engines/timing';
import { scoreWeeklyCalendar, meetsQualityThreshold } from '../scoring/quality-scorer';
import { generatePostText, generateCommentTexts } from '../ai/text-generator';
import { stateManager } from '../state/state-manager';
import { storage } from '../state/storage-factory';

/**
 * Calendar Generator - Main orchestration for weekly calendar generation
 * Coordinates post generation, comment generation, AI text generation,
 * quality scoring, and retry logic
 */

// ============================================================================
// Main Generation Function
// ============================================================================

/**
 * Generate a weekly calendar with retry logic and quality threshold enforcement
 */
export async function generateWeeklyCalendar(
  params: GenerationParams,
  state?: StateStore,
  minQualityScore: number = ALGORITHM_CONFIG.thresholds.minQualityScore
): Promise<WeeklyCalendar> {
  // Load state if not provided
  const currentState = state || (await stateManager.loadState());

  const maxAttempts = ALGORITHM_CONFIG.thresholds.maxRetries;
  let bestCalendar: WeeklyCalendar | null = null;
  let bestScore = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\nAttempt ${attempt}/${maxAttempts}: Generating calendar...`);

    try {
      // Generate calendar
      const calendar = await generateCalendarAttempt(params, currentState, attempt);

      // Track best attempt
      if (calendar.qualityScore.overall > bestScore) {
        bestScore = calendar.qualityScore.overall;
        bestCalendar = calendar;
      }

      // Check if acceptable
      if (meetsQualityThreshold(calendar.qualityScore, minQualityScore)) {
        console.log(
          `✓ Calendar generated successfully with score ${calendar.qualityScore.overall}/10`
        );
        return calendar;
      }

      console.log(
        `  Score: ${calendar.qualityScore.overall}/10 (threshold: ${minQualityScore})`
      );

      if (calendar.qualityScore.flags.length > 0) {
        console.log(`  Flags: ${calendar.qualityScore.flags.length}`);
        calendar.qualityScore.flags.forEach((flag) => {
          console.log(`    - [${flag.severity}] ${flag.message}`);
        });
      }
    } catch (error) {
      console.error(`  Attempt ${attempt} failed:`, error);
      continue;
    }
  }

  // Return best attempt if couldn't meet threshold
  if (bestCalendar) {
    console.warn(
      `\n⚠ Could not meet quality threshold after ${maxAttempts} attempts.`
    );
    console.warn(`  Returning best attempt with score ${bestScore}/10`);
    return bestCalendar;
  }

  throw new CalendarGenerationError(
    'Failed to generate calendar after all retries',
    'GENERATION_FAILED',
    { maxAttempts, minQualityScore }
  );
}

// ============================================================================
// Calendar Generation Attempt
// ============================================================================

async function generateCalendarAttempt(
  params: GenerationParams,
  state: StateStore,
  attempt: number
): Promise<WeeklyCalendar> {
  // Phase 1: Generate posts (structure only, no text yet)
  console.log('  Phase 1: Generating post structure...');
  let posts = await generatePosts(params, state);

  // Phase 2: Generate comments (structure only)
  console.log('  Phase 2: Generating comment structure...');
  const comments = generateComments(posts, params.personas, state);

  // Phase 3: Distribute posts temporally
  console.log('  Phase 3: Distributing posts across week...');
  posts = distributePostsTemporally(posts);

  // Phase 4: Generate text with AI
  console.log('  Phase 4: Generating text with AI...');
  posts = await generatePostTexts(posts, params);
  const updatedComments = await generateCommentTexts(
    comments,
    posts,
    params.personas!
  );

  // Phase 5: Create calendar object
  const weekId = generateWeekId();
  const calendar: WeeklyCalendar = {
    weekId,
    startDate: posts[0]?.timestamp || new Date(),
    posts,
    comments: updatedComments,
    qualityScore: {
      overall: 0,
      naturalness: 0,
      distribution: 0,
      consistency: 0,
      diversity: 0,
      timing: 0,
      flags: [],
    },
    status: 'draft',
    metadata: {
      generatedAt: Date.now(),
      parameters: {
        attempt,
        minQualityScore: params.minQualityScore,
      },
    },
  };

  // Phase 6: Score quality
  console.log('  Phase 5: Scoring quality...');
  calendar.qualityScore = scoreWeeklyCalendar(calendar, state);

  return calendar;
}

// ============================================================================
// Text Generation Helpers
// ============================================================================

async function generatePostTexts(
  posts: Post[],
  params: GenerationParams
): Promise<Post[]> {
  return await Promise.all(
    posts.map(async (post) => {
      const persona = params?.personas?.find((p) => p.username === post.author_username);
      if (!persona) return post;

      const topic = {
        persona,
        subreddit: post.subreddit,
        painPoint: {
          text: post.metadata.topic,
          keywords: [],
          intensity: 0.8,
        },
        format: {
          type: post.metadata.intent,
          template: '',
          example: '',
          weight: 1.0,
        },
        intent: post.metadata.intent,
      };

      const keyword = params?.keywords?.find((k) => post.keyword_ids.includes(k.id));
      if (!keyword) return post;

      // Generate text
      const { title, body } = await generatePostText(post, persona, topic, keyword);

      return {
        ...post,
        title,
        body,
      };
    })
  );
}

// ============================================================================
// Calendar Management
// ============================================================================

/**
 * Save calendar and update state
 */
export async function saveCalendar(calendar: WeeklyCalendar): Promise<void> {
  await storage.saveCalendar(calendar);

  // Update state
  await stateManager.updateStateWithCalendar(calendar);

  console.log(`Calendar ${calendar.weekId} saved successfully`);
}

/**
 * Approve and mark calendar as ready
 */
export async function approveCalendar(weekId: string): Promise<WeeklyCalendar> {
  const calendar = await storage.loadCalendar(weekId);

  calendar.status = 'approved';

  await storage.saveCalendar(calendar);

  console.log(`Calendar ${weekId} approved`);

  return calendar;
}

/**
 * List all calendars
 */
export async function listCalendars(): Promise<string[]> {
  return await storage.listCalendars();
}

/**
 * Load calendar by ID
 */
export async function loadCalendar(weekId: string): Promise<WeeklyCalendar> {
  return await storage.loadCalendar(weekId);
}

// ============================================================================
// Generation with Auto-Save
// ============================================================================

/**
 * Generate and auto-save calendar
 */
export async function generateAndSaveCalendar(
  params: GenerationParams,
  minQualityScore?: number
): Promise<WeeklyCalendar> {
  console.log('\n=== Starting Calendar Generation ===\n');

  const calendar = await generateWeeklyCalendar(params, undefined, minQualityScore);

  await saveCalendar(calendar);

  console.log('\n=== Calendar Generation Complete ===\n');

  return calendar;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Generate calendar with default params from storage
 */
export async function generateCalendarFromStorage(
  minQualityScore?: number
): Promise<WeeklyCalendar> {
  console.log('Loading configuration from storage...');

  const companyInfo = await storage.loadCompanyInfo();
  const personas = await storage.loadPersonas();
  const keywords = await storage.loadKeywords();

  const params: GenerationParams = {
    companyInfo,
    personas,
    subreddits: companyInfo.subreddits,
    keywords,
    postsPerWeek: companyInfo.postsPerWeek,
    minQualityScore: minQualityScore || ALGORITHM_CONFIG.thresholds.minQualityScore,
  };

  return await generateAndSaveCalendar(params, minQualityScore);
}

/**
 * Generate multiple weeks at once
 */
export async function generateMultipleWeeks(
  weekCount: number,
  minQualityScore?: number
): Promise<WeeklyCalendar[]> {
  const calendars: WeeklyCalendar[] = [];

  for (let i = 0; i < weekCount; i++) {
    console.log(`\n\n=== Generating Week ${i + 1}/${weekCount} ===\n`);

    const calendar = await generateCalendarFromStorage(minQualityScore);
    calendars.push(calendar);

    // Brief pause between weeks
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return calendars;
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Export calendar to CSV format matching the sample
 */
export function exportCalendarToCSV(calendar: WeeklyCalendar): string {
  let csv = 'post_id,subreddit,title,body,author_username,timestamp,keyword_ids\n';

  calendar.posts.forEach((post) => {
    const row = [
      post.post_id,
      post.subreddit,
      `"${post.title.replace(/"/g, '""')}"`,
      `"${post.body.replace(/"/g, '""')}"`,
      post.author_username,
      post.timestamp.toISOString(),
      `"${post.keyword_ids.join(', ')}"`,
    ].join(',');
    csv += row + '\n';
  });

  csv += '\n\ncomment_id,post_id,parent_comment_id,comment_text,username,timestamp\n';

  calendar.comments.forEach((comment) => {
    const row = [
      comment.comment_id,
      comment.post_id,
      comment.parent_comment_id || '',
      `"${comment.comment_text.replace(/"/g, '""')}"`,
      comment.username,
      comment.timestamp.toISOString(),
    ].join(',');
    csv += row + '\n';
  });

  return csv;
}
