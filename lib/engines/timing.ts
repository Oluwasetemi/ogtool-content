import { Post, Comment } from '../core/types';
import { DAY_DISTRIBUTION, TIME_DISTRIBUTION } from '../core/constants';
import { weightedRandomSelect, randomInt } from '../utils/random';

/**
 * Timing Module - Distribute posts and comments temporally
 * with realistic patterns
 */

// ============================================================================
// Post Timing Distribution
// ============================================================================

/**
 * Distribute posts across the week with realistic timing
 */
export function distributePostsTemporally(posts: Post[]): Post[] {
  const weekStart = getNextMonday();

  return posts.map((post, index) => {
    // Select day of week
    const dayOptions = DAY_DISTRIBUTION.map((d) => ({
      value: d.day,
      weight: d.weight,
    }));
    const selectedDay = weightedRandomSelect(dayOptions);
    const dayOffset = getDayOffset(selectedDay);

    // Select time of day
    const timeOptions = TIME_DISTRIBUTION.map((t) => ({
      value: t,
      weight: t.weight,
    }));
    const selectedTime = weightedRandomSelect(timeOptions);
    const hour = randomInt(selectedTime.hourRange[0], selectedTime.hourRange[1]);
    const minutes = randomInt(0, 59);

    // Calculate timestamp
    const timestamp = new Date(
      weekStart.getTime() +
        dayOffset * 24 * 60 * 60 * 1000 +
        hour * 60 * 60 * 1000 +
        minutes * 60 * 1000
    );

    return {
      ...post,
      timestamp,
    };
  });
}

/**
 * Get the next Monday from now
 */
export function getNextMonday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  return nextMonday;
}

/**
 * Get day offset from day name
 */
function getDayOffset(dayName: string): number {
  const days: Record<string, number> = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };

  return days[dayName] || 0;
}

// ============================================================================
// Comment Timing Distribution
// ============================================================================

/**
 * Adjust comment timestamps to be relative to their posts
 * (This is mostly handled in comment-engine, but we can refine here)
 */
export function adjustCommentTimestamps(
  comments: Comment[],
  posts: Post[]
): Comment[] {
  return comments.map((comment) => {
    // Find the post this comment belongs to
    const post = posts.find((p) => p.post_id === comment.post_id);
    if (!post) return comment;

    // Comments already have timestamps set relative to post
    // Just ensure they're after the post
    if (comment.timestamp <= post.timestamp) {
      comment.timestamp = new Date(post.timestamp.getTime() + 10 * 60 * 1000);
    }

    return comment;
  });
}

// ============================================================================
// Timing Analysis
// ============================================================================

/**
 * Calculate gaps between comments in a thread
 */
export function calculateCommentGaps(comments: Comment[]): number[] {
  const sorted = [...comments].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gapMs = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
    const gapMinutes = gapMs / (1000 * 60);
    gaps.push(gapMinutes);
  }

  return gaps;
}

/**
 * Check if timing patterns look suspicious (too uniform)
 */
export function hasSuspiciousTimingPatterns(gaps: number[]): boolean {
  if (gaps.length < 3) return false;

  // Check for too uniform gaps
  const avg = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const variance =
    gaps.reduce((sum, gap) => sum + Math.pow(gap - avg, 2), 0) / gaps.length;
  const stdDev = Math.sqrt(variance);

  // If standard deviation is very low, gaps are too uniform
  if (stdDev < 2) return true;

  // Check for exact repeating patterns
  for (let i = 0; i < gaps.length - 1; i++) {
    if (Math.abs(gaps[i] - gaps[i + 1]) < 0.5) {
      // Two consecutive gaps within 30 seconds
      return true;
    }
  }

  return false;
}

/**
 * Get distribution of posts by day of week
 */
export function getPostDistributionByDay(posts: Post[]): Record<string, number> {
  const distribution: Record<string, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0,
  };

  posts.forEach((post) => {
    const dayName = post.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
    distribution[dayName]++;
  });

  return distribution;
}

/**
 * Get distribution of posts by time of day
 */
export function getPostDistributionByTime(posts: Post[]): {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
} {
  const distribution = {
    morning: 0, // 6am-12pm
    afternoon: 0, // 12pm-5pm
    evening: 0, // 5pm-10pm
    night: 0, // 10pm-6am
  };

  posts.forEach((post) => {
    const hour = post.timestamp.getHours();

    if (hour >= 6 && hour < 12) {
      distribution.morning++;
    } else if (hour >= 12 && hour < 17) {
      distribution.afternoon++;
    } else if (hour >= 17 && hour < 22) {
      distribution.evening++;
    } else {
      distribution.night++;
    }
  });

  return distribution;
}

/**
 * Check if posts are too concentrated in time
 */
export function arePostsTooConcentrated(posts: Post[]): boolean {
  if (posts.length < 2) return false;

  const timestamps = posts.map((p) => p.timestamp.getTime()).sort((a, b) => a - b);

  // Check if any two posts are within 1 hour
  for (let i = 1; i < timestamps.length; i++) {
    const gapHours = (timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60);
    if (gapHours < 1) {
      return true;
    }
  }

  return false;
}

/**
 * Check if too many posts on weekend
 */
export function hasTooManyWeekendPosts(posts: Post[]): boolean {
  const distribution = getPostDistributionByDay(posts);
  const weekendCount = distribution.Saturday + distribution.Sunday;
  const totalCount = posts.length;

  // Weekend posts should be less than 15% of total
  return weekendCount / totalCount > 0.15;
}

/**
 * Check if any posts during suspicious hours (2am-6am)
 */
export function hasSuspiciousHourPosts(posts: Post[]): boolean {
  return posts.some((post) => {
    const hour = post.timestamp.getHours();
    return hour >= 2 && hour < 6;
  });
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get time gap description
 */
export function describeTimeGap(minutes: number): string {
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${Math.round(minutes)} minutes`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}
