import { WeeklyCalendar, StateStore } from '../core/types';

/**
 * Distribution Scoring - Check balance of persona/subreddit/keyword usage
 * Target: 8.0+ for good balance
 */

export function scoreDistribution(calendar: WeeklyCalendar, state: StateStore): number {
  let score = 10.0;

  // Check 1: Persona distribution
  const personaPenalty = checkPersonaDistribution(calendar);
  score -= personaPenalty;

  // Check 2: Subreddit distribution
  const subredditPenalty = checkSubredditDistribution(calendar);
  score -= subredditPenalty;

  // Check 3: Keyword distribution
  const keywordPenalty = checkKeywordDistribution(calendar);
  score -= keywordPenalty;

  return Math.max(0, Math.min(10, score));
}

function checkPersonaDistribution(calendar: WeeklyCalendar): number {
  const personaCounts: Record<string, number> = {};

  // Count posts as OP
  calendar.posts.forEach((p) => {
    personaCounts[p.author_username] = (personaCounts[p.author_username] || 0) + 1;
  });

  // Count comments
  calendar.comments.forEach((c) => {
    personaCounts[c.username] = (personaCounts[c.username] || 0) + 1;
  });

  const counts = Object.values(personaCounts);
  if (counts.length === 0) return 0;

  const max = Math.max(...counts);
  const min = Math.min(...counts.filter((c) => c > 0));

  // Penalty if one persona dominates
  if (max > min * 3) {
    return 2.0; // Significant imbalance
  }
  if (max > min * 2) {
    return 1.0; // Moderate imbalance
  }

  return 0;
}

function checkSubredditDistribution(calendar: WeeklyCalendar): number {
  const subredditCounts: Record<string, number> = {};

  calendar.posts.forEach((p) => {
    subredditCounts[p.subreddit] = (subredditCounts[p.subreddit] || 0) + 1;
  });

  // Heavy penalty for posting to same subreddit twice
  if (Object.values(subredditCounts).some((count) => count > 1)) {
    return 3.0; // Critical issue
  }

  return 0;
}

function checkKeywordDistribution(calendar: WeeklyCalendar): number {
  const keywordCounts: Record<string, number> = {};

  calendar.posts.forEach((p) => {
    p.keyword_ids.forEach((kid) => {
      keywordCounts[kid] = (keywordCounts[kid] || 0) + 1;
    });
  });

  // Slight penalty if same keyword used 3+ times
  if (Object.values(keywordCounts).some((count) => count >= 3)) {
    return 1.0;
  }

  return 0;
}

export function getPersonaCounts(calendar: WeeklyCalendar): Record<string, number> {
  const counts: Record<string, number> = {};
  calendar.posts.forEach((p) => {
    counts[p.author_username] = (counts[p.author_username] || 0) + 1;
  });
  calendar.comments.forEach((c) => {
    counts[c.username] = (counts[c.username] || 0) + 1;
  });
  return counts;
}
