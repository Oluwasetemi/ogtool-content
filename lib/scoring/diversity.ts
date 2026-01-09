import { WeeklyCalendar, StateStore } from '../core/types';
import { cosineSimilarity } from '../utils/similarity';

/**
 * Diversity Scoring - Ensure variety across weeks
 * Target: 8.0+ for fresh content
 */

export function scoreDiversity(calendar: WeeklyCalendar, state: StateStore): number {
  let score = 10.0;

  // Check 1: Topic repetition
  const topicPenalty = checkTopicRepetition(calendar, state);
  score -= topicPenalty;

  // Check 2: Subreddit rotation
  const subredditPenalty = checkSubredditRotation(calendar, state);
  score -= subredditPenalty;

  // Check 3: Persona pairing repetition
  const pairingPenalty = checkPairingRepetition(calendar, state);
  score -= pairingPenalty;

  return Math.max(0, Math.min(10, score));
}

function checkTopicRepetition(calendar: WeeklyCalendar, state: StateStore): number {
  const recentWeeks = state.history.weeks.slice(-4); // Last 4 weeks
  if (recentWeeks.length === 0) return 0; // No history yet

  const currentTopics = calendar.posts.map((p) => p.metadata.topic);
  const recentTopics = recentWeeks.flatMap((w) => w.posts.map((p) => p.metadata.topic));

  let penalty = 0;

  currentTopics.forEach((topic) => {
    recentTopics.forEach((recentTopic) => {
      const similarity = cosineSimilarity(topic, recentTopic);
      if (similarity > 0.75) {
        penalty += 1.5; // Similar topic found
      }
    });
  });

  return Math.min(penalty, 4.0); // Cap at 4.0
}

function checkSubredditRotation(calendar: WeeklyCalendar, state: StateStore): number {
  const currentSubs = calendar.posts.map((p) => p.subreddit);
  const recentSubs = state.patterns.subredditRotation.slice(-6); // Last 6 posts

  if (recentSubs.length === 0) return 0;

  let penalty = 0;

  currentSubs.forEach((sub) => {
    if (recentSubs.includes(sub)) {
      penalty += 2.0; // Repeated subreddit from recent weeks
    }
  });

  return Math.min(penalty, 3.0);
}

function checkPairingRepetition(calendar: WeeklyCalendar, state: StateStore): number {
  const currentPairings = extractPersonaPairings(calendar);
  let penalty = 0;

  currentPairings.forEach((pair) => {
    const pairCount = state.patterns.personaPairings[pair] || 0;
    if (pairCount >= 2) {
      penalty += 1.0; // This pairing has been used 2+ times before
    }
  });

  return Math.min(penalty, 2.0);
}

function extractPersonaPairings(calendar: WeeklyCalendar): string[] {
  const pairings: string[] = [];

  calendar.posts.forEach((post) => {
    const commenters = calendar.comments
      .filter((c) => c.post_id === post.post_id)
      .map((c) => c.username);

    commenters.forEach((commenter) => {
      if (commenter !== post.author_username) {
        const pair = [post.author_username, commenter].sort().join('+');
        pairings.push(pair);
      }
    });
  });

  return pairings;
}
