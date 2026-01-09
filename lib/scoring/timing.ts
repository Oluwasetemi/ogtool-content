import { WeeklyCalendar } from '../core/types';
import { variance } from '../utils/similarity';

/**
 * Timing Scoring - Check for realistic timing patterns
 * Target: 8.0+ for organic timing
 */

export function scoreTiming(calendar: WeeklyCalendar): number {
  let score = 10.0;

  // Check 1: Comment gaps (should be varied)
  const gapPenalty = checkCommentGaps(calendar);
  score -= gapPenalty;

  // Check 2: Post distribution (avoid weekends, avoid clustering)
  const distributionPenalty = checkPostDistribution(calendar);
  score -= distributionPenalty;

  // Check 3: Suspicious hours (2am-6am)
  const hourPenalty = checkSuspiciousHours(calendar);
  score -= hourPenalty;

  return Math.max(0, Math.min(10, score));
}

function checkCommentGaps(calendar: WeeklyCalendar): number {
  let penalty = 0;

  calendar.posts.forEach((post) => {
    const postComments = calendar.comments
      .filter((c) => c.post_id === post.post_id)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (postComments.length < 2) return;

    const gaps: number[] = [];
    for (let i = 1; i < postComments.length; i++) {
      const gapMinutes =
        (postComments[i].timestamp.getTime() - postComments[i - 1].timestamp.getTime()) /
        (1000 * 60);
      gaps.push(gapMinutes);
    }

    // Check for suspicious uniformity
    if (gaps.length >= 2) {
      const gapVariance = variance(gaps);
      if (gapVariance < 4) {
        penalty += 1.5; // Too uniform
      }
    }

    // Check for gaps outside realistic range (8-30 minutes)
    gaps.forEach((gap) => {
      if (gap < 5 || gap > 40) {
        penalty += 0.5;
      }
    });
  });

  return Math.min(penalty, 3.0);
}

function checkPostDistribution(calendar: WeeklyCalendar): number {
  let penalty = 0;

  // Check day distribution
  const dayDistribution: Record<string, number> = {};
  calendar.posts.forEach((post) => {
    const day = post.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
    dayDistribution[day] = (dayDistribution[day] || 0) + 1;
  });

  // Check for weekend posts (should be rare)
  const weekendCount = (dayDistribution['Saturday'] || 0) + (dayDistribution['Sunday'] || 0);
  if (weekendCount > calendar.posts.length * 0.2) {
    penalty += 2.0; // Too many weekend posts
  }

  // Check for clustering (posts too close together)
  const timestamps = calendar.posts
    .map((p) => p.timestamp.getTime())
    .sort((a, b) => a - b);

  for (let i = 1; i < timestamps.length; i++) {
    const hoursDiff = (timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60);
    if (hoursDiff < 1) {
      penalty += 1.5; // Posts within 1 hour = suspicious
    }
  }

  return Math.min(penalty, 3.0);
}

function checkSuspiciousHours(calendar: WeeklyCalendar): number {
  let penalty = 0;

  // Check posts
  calendar.posts.forEach((post) => {
    const hour = post.timestamp.getHours();
    if (hour >= 2 && hour < 6) {
      penalty += 1.5; // Posting at 2-6am is suspicious
    }
  });

  // Check comments
  calendar.comments.forEach((comment) => {
    const hour = comment.timestamp.getHours();
    if (hour >= 2 && hour < 6) {
      penalty += 0.5; // Commenting at 2-6am (less suspicious than posting)
    }
  });

  return Math.min(penalty, 2.0);
}

export function getTimingStats(calendar: WeeklyCalendar): {
  avgCommentGap: number;
  minCommentGap: number;
  maxCommentGap: number;
  weekendPostRatio: number;
} {
  const allGaps: number[] = [];

  calendar.posts.forEach((post) => {
    const postComments = calendar.comments
      .filter((c) => c.post_id === post.post_id)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 1; i < postComments.length; i++) {
      const gapMinutes =
        (postComments[i].timestamp.getTime() - postComments[i - 1].timestamp.getTime()) /
        (1000 * 60);
      allGaps.push(gapMinutes);
    }
  });

  const dayDistribution: Record<string, number> = {};
  calendar.posts.forEach((post) => {
    const day = post.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
    dayDistribution[day] = (dayDistribution[day] || 0) + 1;
  });

  const weekendCount = (dayDistribution['Saturday'] || 0) + (dayDistribution['Sunday'] || 0);

  return {
    avgCommentGap: allGaps.length > 0 ? allGaps.reduce((sum, g) => sum + g, 0) / allGaps.length : 0,
    minCommentGap: allGaps.length > 0 ? Math.min(...allGaps) : 0,
    maxCommentGap: allGaps.length > 0 ? Math.max(...allGaps) : 0,
    weekendPostRatio: calendar.posts.length > 0 ? weekendCount / calendar.posts.length : 0,
  };
}
