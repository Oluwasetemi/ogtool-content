import { WeeklyCalendar, QualityScore, QualityFlag, StateStore } from '../core/types';
import { ALGORITHM_CONFIG, FLAG_SEVERITY_THRESHOLDS } from '../core/constants';
import { scoreNaturalness } from './naturalness';
import { scoreDistribution } from './distribution';
import { scoreConsistency } from './consistency';
import { scoreDiversity } from './diversity';
import { scoreTiming } from './timing';

/**
 * Quality Scorer - Multi-dimensional quality assessment
 * Scores calendars on naturalness, distribution, consistency, diversity, and timing
 */

// ============================================================================
// Main Quality Scoring
// ============================================================================

export function scoreWeeklyCalendar(
  calendar: WeeklyCalendar,
  state: StateStore
): QualityScore {
  // Calculate individual dimension scores
  const naturalness = scoreNaturalness(calendar);
  const distribution = scoreDistribution(calendar, state);
  const consistency = scoreConsistency(calendar);
  const diversity = scoreDiversity(calendar, state);
  const timing = scoreTiming(calendar);

  // Calculate weighted overall score
  const overall =
    naturalness * ALGORITHM_CONFIG.weights.naturalness +
    distribution * ALGORITHM_CONFIG.weights.distribution +
    consistency * ALGORITHM_CONFIG.weights.consistency +
    diversity * ALGORITHM_CONFIG.weights.diversity +
    timing * ALGORITHM_CONFIG.weights.timing;

  // Detect quality flags
  const flags = detectQualityFlags(calendar, {
    naturalness,
    distribution,
    consistency,
    diversity,
    timing,
  });

  return {
    overall: Math.round(overall * 10) / 10, // Round to 1 decimal
    naturalness: Math.round(naturalness * 10) / 10,
    distribution: Math.round(distribution * 10) / 10,
    consistency: Math.round(consistency * 10) / 10,
    diversity: Math.round(diversity * 10) / 10,
    timing: Math.round(timing * 10) / 10,
    flags,
  };
}

// ============================================================================
// Quality Flag Detection
// ============================================================================

function detectQualityFlags(
  calendar: WeeklyCalendar,
  scores: {
    naturalness: number;
    distribution: number;
    consistency: number;
    diversity: number;
    timing: number;
  }
): QualityFlag[] {
  const flags: QualityFlag[] = [];

  // Critical flags (auto-reject)
  if (scores.distribution < FLAG_SEVERITY_THRESHOLDS.distribution.critical) {
    flags.push({
      severity: 'critical',
      category: 'distribution',
      message: 'Severe imbalance in persona/subreddit usage',
      recommendation: 'Regenerate with stricter distribution constraints',
    });
  }

  if (scores.naturalness < FLAG_SEVERITY_THRESHOLDS.naturalness.critical) {
    flags.push({
      severity: 'critical',
      category: 'naturalness',
      message: 'Language appears highly manufactured',
      recommendation: 'Increase naturalness transformations and add more imperfections',
    });
  }

  // Warning flags
  if (
    scores.naturalness < FLAG_SEVERITY_THRESHOLDS.naturalness.warning &&
    scores.naturalness >= FLAG_SEVERITY_THRESHOLDS.naturalness.critical
  ) {
    flags.push({
      severity: 'warning',
      category: 'naturalness',
      message: 'Language may seem manufactured',
      recommendation: 'Review keyword integration and add more casual language',
    });
  }

  if (
    scores.distribution < FLAG_SEVERITY_THRESHOLDS.distribution.warning &&
    scores.distribution >= FLAG_SEVERITY_THRESHOLDS.distribution.critical
  ) {
    flags.push({
      severity: 'warning',
      category: 'distribution',
      message: 'Some imbalance in persona/subreddit distribution',
      recommendation: 'Check for repeated subreddits or overused personas',
    });
  }

  if (
    scores.consistency < FLAG_SEVERITY_THRESHOLDS.consistency.warning
  ) {
    flags.push({
      severity: 'warning',
      category: 'consistency',
      message: 'Some persona voice inconsistencies detected',
      recommendation: 'Review persona-specific language patterns',
    });
  }

  // Check specific issues
  if (hasRepeatedSubreddit(calendar)) {
    flags.push({
      severity: 'warning',
      category: 'distribution',
      message: 'Multiple posts to same subreddit in one week',
      recommendation: 'Spread posts across different subreddits',
    });
  }

  if (hasSuspiciousTiming(calendar)) {
    flags.push({
      severity: 'info',
      category: 'timing',
      message: 'Comment timing patterns may look automated',
      recommendation: 'Increase randomness in comment gaps',
    });
  }

  // Info flags
  if (scores.diversity < 7.0) {
    flags.push({
      severity: 'info',
      category: 'diversity',
      message: 'Some topic or subreddit repetition from recent weeks',
      recommendation: 'Review recent calendars for overlap',
    });
  }

  return flags;
}

// ============================================================================
// Helper Functions for Flag Detection
// ============================================================================

function hasRepeatedSubreddit(calendar: WeeklyCalendar): boolean {
  const subreddits = calendar.posts.map((p) => p.subreddit);
  const uniqueSubreddits = new Set(subreddits);
  return uniqueSubreddits.size < subreddits.length;
}

function hasSuspiciousTiming(calendar: WeeklyCalendar): boolean {
  // Check for overly uniform timing
  const commentsByPost = new Map<string, typeof calendar.comments>();

  calendar.posts.forEach((post) => {
    const postComments = calendar.comments
      .filter((c) => c.post_id === post.post_id)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (postComments.length > 1) {
      commentsByPost.set(post.post_id, postComments);
    }
  });

  for (const [, comments] of commentsByPost) {
    const gaps: number[] = [];
    for (let i = 1; i < comments.length; i++) {
      const gapMinutes =
        (comments[i].timestamp.getTime() - comments[i - 1].timestamp.getTime()) /
        (1000 * 60);
      gaps.push(gapMinutes);
    }

    // Check for too uniform gaps
    if (gaps.length >= 2) {
      const avg = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      const variance =
        gaps.reduce((sum, gap) => sum + Math.pow(gap - avg, 2), 0) / gaps.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 2) {
        return true; // Suspicious uniformity
      }
    }
  }

  return false;
}

// ============================================================================
// Quality Helpers
// ============================================================================

/**
 * Check if quality score meets threshold
 */
export function meetsQualityThreshold(
  score: QualityScore,
  threshold: number
): boolean {
  return (
    score.overall >= threshold &&
    !score.flags.some((f) => f.severity === 'critical')
  );
}

/**
 * Get quality grade (S, A, B, C, D, F)
 */
export function getQualityGrade(score: number): string {
  if (score >= 9.0) return 'S'; // Exceptional
  if (score >= 8.5) return 'A+'; // Excellent
  if (score >= 8.0) return 'A'; // Great
  if (score >= 7.5) return 'B+'; // Good
  if (score >= 7.0) return 'B'; // Acceptable
  if (score >= 6.0) return 'C'; // Needs improvement
  if (score >= 5.0) return 'D'; // Poor
  return 'F'; // Unacceptable
}

/**
 * Get quality description
 */
export function getQualityDescription(score: number): string {
  if (score >= 8.5) return 'Excellent - Near perfect quality, indistinguishable from organic';
  if (score >= 7.5) return 'Good - High quality with minor issues';
  if (score >= 7.0) return 'Acceptable - Meets minimum threshold, ready to use';
  if (score >= 6.0) return 'Fair - Below threshold, needs improvement';
  return 'Poor - Significant issues, regeneration recommended';
}

/**
 * Get flag severity color
 */
export function getFlagSeverityColor(severity: QualityFlag['severity']): string {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'warning':
      return 'orange';
    case 'info':
      return 'blue';
    default:
      return 'gray';
  }
}

/**
 * Check if calendar should be auto-rejected
 */
export function shouldAutoReject(score: QualityScore): boolean {
  return (
    score.overall < ALGORITHM_CONFIG.thresholds.minQualityScore ||
    score.flags.some((f) => f.severity === 'critical')
  );
}

/**
 * Generate quality report summary
 */
export function generateQualityReport(score: QualityScore): string {
  const grade = getQualityGrade(score.overall);
  const description = getQualityDescription(score.overall);

  let report = `Overall Score: ${score.overall}/10 (Grade: ${grade})\n`;
  report += `${description}\n\n`;
  report += `Dimension Scores:\n`;
  report += `  • Naturalness: ${score.naturalness}/10\n`;
  report += `  • Distribution: ${score.distribution}/10\n`;
  report += `  • Consistency: ${score.consistency}/10\n`;
  report += `  • Diversity: ${score.diversity}/10\n`;
  report += `  • Timing: ${score.timing}/10\n`;

  if (score.flags.length > 0) {
    report += `\nFlags (${score.flags.length}):\n`;
    score.flags.forEach((flag, index) => {
      report += `  ${index + 1}. [${flag.severity.toUpperCase()}] ${flag.message}\n`;
      report += `     → ${flag.recommendation}\n`;
    });
  } else {
    report += `\nNo quality flags detected. ✓\n`;
  }

  return report;
}
