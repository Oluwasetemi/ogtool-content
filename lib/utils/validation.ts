import {
  CompanyInfo,
  Persona,
  Keyword,
  Post,
  Comment,
  WeeklyCalendar,
} from '../core/types';

/**
 * Validate company info structure
 */
export function validateCompanyInfo(data: unknown): data is CompanyInfo {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Company info must be an object');
  }

  const company = data as Partial<CompanyInfo>;

  if (!company.name || typeof company.name !== 'string') {
    throw new Error('Company name is required and must be a string');
  }

  if (!company.subreddits || !Array.isArray(company.subreddits)) {
    throw new Error('Subreddits must be an array');
  }

  if (
    company.postsPerWeek === undefined ||
    typeof company.postsPerWeek !== 'number'
  ) {
    throw new Error('postsPerWeek must be a number');
  }

  return true;
}

/**
 * Validate persona structure
 */
export function validatePersona(data: unknown): data is Persona {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Persona must be an object');
  }

  const persona = data as Partial<Persona>;

  if (!persona.username || typeof persona.username !== 'string') {
    throw new Error('Persona username is required');
  }

  if (!persona.backstory || typeof persona.backstory !== 'string') {
    throw new Error('Persona backstory is required');
  }

  if (!persona.voiceProfile || typeof persona.voiceProfile !== 'object') {
    throw new Error('Persona voiceProfile is required');
  }

  return true;
}

/**
 * Validate keyword structure
 */
export function validateKeyword(data: unknown): data is Keyword {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Keyword must be an object');
  }

  const keyword = data as Partial<Keyword>;

  if (!keyword.id || typeof keyword.id !== 'string') {
    throw new Error('Keyword id is required');
  }

  if (!keyword.keyword || typeof keyword.keyword !== 'string') {
    throw new Error('Keyword text is required');
  }

  return true;
}

/**
 * Validate post structure
 */
export function validatePost(data: unknown): data is Post {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Post must be an object');
  }

  const post = data as Partial<Post>;

  if (!post.post_id || typeof post.post_id !== 'string') {
    throw new Error('Post ID is required');
  }

  if (!post.title || typeof post.title !== 'string') {
    throw new Error('Post title is required');
  }

  if (!post.subreddit || typeof post.subreddit !== 'string') {
    throw new Error('Post subreddit is required');
  }

  if (!post.author_username || typeof post.author_username !== 'string') {
    throw new Error('Post author is required');
  }

  if (!Array.isArray(post.keyword_ids)) {
    throw new Error('Post keyword_ids must be an array');
  }

  return true;
}

/**
 * Validate comment structure
 */
export function validateComment(data: unknown): data is Comment {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Comment must be an object');
  }

  const comment = data as Partial<Comment>;

  if (!comment.comment_id || typeof comment.comment_id !== 'string') {
    throw new Error('Comment ID is required');
  }

  if (!comment.post_id || typeof comment.post_id !== 'string') {
    throw new Error('Comment post_id is required');
  }

  if (!comment.comment_text || typeof comment.comment_text !== 'string') {
    throw new Error('Comment text is required');
  }

  if (!comment.username || typeof comment.username !== 'string') {
    throw new Error('Comment username is required');
  }

  return true;
}

/**
 * Validate calendar structure
 */
export function validateCalendar(data: unknown): data is WeeklyCalendar {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Calendar must be an object');
  }

  const calendar = data as Partial<WeeklyCalendar>;

  if (!calendar.weekId || typeof calendar.weekId !== 'string') {
    throw new Error('Calendar weekId is required');
  }

  if (!Array.isArray(calendar.posts)) {
    throw new Error('Calendar posts must be an array');
  }

  if (!Array.isArray(calendar.comments)) {
    throw new Error('Calendar comments must be an array');
  }

  if (!calendar.qualityScore || typeof calendar.qualityScore !== 'object') {
    throw new Error('Calendar qualityScore is required');
  }

  // Validate all posts
  calendar.posts.forEach((post, index) => {
    try {
      validatePost(post);
    } catch (error) {
      throw new Error(
        `Invalid post at index ${index}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  });

  // Validate all comments
  calendar.comments.forEach((comment, index) => {
    try {
      validateComment(comment);
    } catch (error) {
      throw new Error(
        `Invalid comment at index ${index}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  });

  return true;
}

/**
 * Check if a subreddit name is valid
 */
export function isValidSubreddit(subreddit: string): boolean {
  return /^r\/[a-zA-Z0-9_]+$/.test(subreddit);
}

/**
 * Sanitize text input
 */
export function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Check if quality score is acceptable
 */
export function isQualityScoreAcceptable(
  score: number,
  threshold: number
): boolean {
  return score >= threshold;
}

/**
 * Validate generation parameters
 */
export function validateGenerationParams(params: {
  postsPerWeek?: number;
  minQualityScore?: number;
}): void {
  if (params.postsPerWeek !== undefined) {
    if (
      typeof params.postsPerWeek !== 'number' ||
      params.postsPerWeek < 1 ||
      params.postsPerWeek > 10
    ) {
      throw new Error('postsPerWeek must be a number between 1 and 10');
    }
  }

  if (params.minQualityScore !== undefined) {
    if (
      typeof params.minQualityScore !== 'number' ||
      params.minQualityScore < 0 ||
      params.minQualityScore > 10
    ) {
      throw new Error('minQualityScore must be a number between 0 and 10');
    }
  }
}
