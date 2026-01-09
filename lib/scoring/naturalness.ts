import { WeeklyCalendar } from '../core/types';
import { CASUAL_MARKERS } from '../core/constants';
import { variance } from '../utils/similarity';

/**
 * Naturalness Scoring - Detect organic vs manufactured language
 * Target: 8.0+ for good quality, 8.5+ for excellent
 */

export function scoreNaturalness(calendar: WeeklyCalendar): number {
  let score = 10.0;

  // Check 1: Language imperfections (good!)
  const hasImperfections = checkForImperfections(calendar);
  if (!hasImperfections) {
    score -= 1.5; // Too perfect = suspicious
  }

  // Check 2: Variety in sentence structure
  const sentenceVariety = checkSentenceVariety(calendar);
  if (sentenceVariety < 0.5) {
    score -= 1.0; // Too uniform
  }

  // Check 3: Comment naturalness
  const commentNaturalness = checkCommentNaturalness(calendar);
  score -= (1.0 - commentNaturalness) * 2.0; // Scale impact

  // Check 4: Keyword forcing detection
  const keywordForcingPenalty = checkKeywordForcing(calendar);
  score -= keywordForcingPenalty;

  return Math.max(0, Math.min(10, score));
}

// ============================================================================
// Imperfection Checks
// ============================================================================

function checkForImperfections(calendar: WeeklyCalendar): boolean {
  const allText = [
    ...calendar.posts.map((p) => p.title),
    ...calendar.comments.map((c) => c.comment_text),
  ];

  // Look for casual markers
  const hasCasualLanguage = allText.some((text) =>
    CASUAL_MARKERS.some((marker) => text.toLowerCase().includes(marker))
  );

  // Look for lowercase starts
  const hasLowercaseStarts = allText.some((text) => /^[a-z]/.test(text));

  // Look for missing punctuation at end
  const hasMissingPunctuation = allText.some(
    (text) => text.length > 10 && !/[.!?]$/.test(text)
  );

  // Look for informal capitalization
  const hasInformalCaps = allText.some((text) => {
    const sentences = text.split(/[.!?]+/);
    return sentences.some((s) => s.trim().length > 0 && /^[a-z]/.test(s.trim()));
  });

  // Return true if at least 2 imperfection types present
  return (
    [
      hasCasualLanguage,
      hasLowercaseStarts,
      hasMissingPunctuation,
      hasInformalCaps,
    ].filter(Boolean).length >= 2
  );
}

// ============================================================================
// Sentence Variety Checks
// ============================================================================

function checkSentenceVariety(calendar: WeeklyCalendar): number {
  const titles = calendar.posts.map((p) => p.title);

  // Calculate lengths
  const lengths = titles.map((title) => title.split(/\s+/).length);

  if (lengths.length < 2) return 1.0;

  // Calculate variance
  const varietyScore = variance(lengths);

  // Normalize (variance of 5+ is good variety)
  return Math.min(1.0, varietyScore / 5);
}

// ============================================================================
// Comment Naturalness Checks
// ============================================================================

function checkCommentNaturalness(calendar: WeeklyCalendar): number {
  const comments = calendar.comments.map((c) => c.comment_text);

  if (comments.length === 0) return 0.8; // Neutral

  let score = 1.0;

  // Check 1: Short agreements ("+1", "same", etc.)
  const hasShortAgreements = comments.some((c) => c.length < 20);
  if (!hasShortAgreements) {
    score -= 0.2;
  }

  // Check 2: Casual language
  const hasCasualLanguage = comments.some((c) =>
    CASUAL_MARKERS.some((marker) => c.toLowerCase().includes(marker))
  );
  if (!hasCasualLanguage) {
    score -= 0.3;
  }

  // Check 3: Length variety
  const lengths = comments.map((c) => c.length);
  const lengthVariance = variance(lengths);
  if (lengthVariance < 100) {
    // Too uniform in length
    score -= 0.2;
  }

  // Check 4: Not too formal
  const formalPatterns = [
    /\b(furthermore|moreover|additionally|consequently)\b/i,
    /\b(utilize|implement|facilitate)\b/i,
  ];
  const hasFormalLanguage = comments.some((c) =>
    formalPatterns.some((pattern) => pattern.test(c))
  );
  if (hasFormalLanguage) {
    score -= 0.3; // Too formal for Reddit
  }

  return Math.max(0, score);
}

// ============================================================================
// Keyword Forcing Detection
// ============================================================================

function checkKeywordForcing(calendar: WeeklyCalendar): number {
  let penalty = 0;

  calendar.posts.forEach((post) => {
    const titleLower = post.title.toLowerCase();
    const bodyLower = post.body.toLowerCase();
    const combinedText = `${titleLower} ${bodyLower}`;

    // Forced patterns (SEO-like)
    const forcedPatterns = [
      /what is the (best|top) .{1,40} for .{1,40}\?/i,
      /looking for .{1,30} tool that .{1,30} and .{1,30} and/i,
      /need .{1,30} software .{1,30} solution/i,
      /can you recommend .{1,30} for .{1,30} and .{1,30}/i,
      /\b(best|top|leading|premier) .{1,20} (tool|software|solution|platform)/i,
    ];

    const seemsForced = forcedPatterns.some((pattern) => pattern.test(combinedText));

    if (seemsForced) {
      penalty += 0.8;
    }

    // Check for keyword stuffing (same keyword multiple times)
    post.keyword_ids.forEach(() => {
      // Count occurrences would require keyword text
      // For now, penalize if too many keywords
      if (post.keyword_ids.length > 3) {
        penalty += 0.3;
      }
    });
  });

  return Math.min(penalty, 3.0); // Cap at 3.0
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if text has typos or informal spelling
 */
function hasTyposOrInformal(text: string): boolean {
  const informalPatterns = [
    /\bu\b/i, // u instead of you
    /\bur\b/i, // ur instead of your
    /\bteh\b/i, // teh instead of the
    /gonna|wanna|gotta/i,
    /\byea\b/i, // yea instead of yeah
  ];

  return informalPatterns.some((pattern) => pattern.test(text));
}

/**
 * Check if text has good casual markers
 */
export function getCasualityScore(text: string): number {
  const textLower = text.toLowerCase();
  let score = 0;

  // Positive casual markers
  CASUAL_MARKERS.forEach((marker) => {
    if (textLower.includes(marker)) {
      score += 0.2;
    }
  });

  // Informal spellings
  if (hasTyposOrInformal(text)) {
    score += 0.1;
  }

  // Lowercase starts
  if (/^[a-z]/.test(text)) {
    score += 0.1;
  }

  // Missing end punctuation
  if (text.length > 10 && !/[.!?]$/.test(text)) {
    score += 0.1;
  }

  return Math.min(1.0, score);
}
