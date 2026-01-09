/**
 * Calculate cosine similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function cosineSimilarity(text1: string, text2: string): number {
  const vector1 = textToVector(text1.toLowerCase());
  const vector2 = textToVector(text2.toLowerCase());

  const dotProduct = calculateDotProduct(vector1, vector2);
  const magnitude1 = calculateMagnitude(vector1);
  const magnitude2 = calculateMagnitude(vector2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Convert text to a word frequency vector
 */
function textToVector(text: string): Map<string, number> {
  const words = text
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2); // Ignore very short words

  const vector = new Map<string, number>();

  for (const word of words) {
    vector.set(word, (vector.get(word) || 0) + 1);
  }

  return vector;
}

/**
 * Calculate dot product of two vectors
 */
function calculateDotProduct(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  let dotProduct = 0;

  for (const [word, count1] of vec1.entries()) {
    const count2 = vec2.get(word);
    if (count2 !== undefined) {
      dotProduct += count1 * count2;
    }
  }

  return dotProduct;
}

/**
 * Calculate magnitude of a vector
 */
function calculateMagnitude(vec: Map<string, number>): number {
  let sumOfSquares = 0;

  for (const count of vec.values()) {
    sumOfSquares += count * count;
  }

  return Math.sqrt(sumOfSquares);
}

/**
 * Calculate Jaccard similarity between two sets of words
 * Returns a value between 0 (no overlap) and 1 (identical)
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const set1 = new Set(
    text1
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  const set2 = new Set(
    text2
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.size / union.size;
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of edits needed to transform text1 into text2
 */
export function levenshteinDistance(text1: string, text2: string): number {
  const len1 = text1.length;
  const len2 = text2.length;

  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = text1[i - 1] === text2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate normalized Levenshtein similarity (0-1 scale)
 */
export function levenshteinSimilarity(text1: string, text2: string): number {
  const distance = levenshteinDistance(text1.toLowerCase(), text2.toLowerCase());
  const maxLength = Math.max(text1.length, text2.length);

  if (maxLength === 0) {
    return 1;
  }

  return 1 - distance / maxLength;
}

/**
 * Check if two topics are similar based on multiple metrics
 */
export function areTopicsSimilar(
  topic1: string,
  topic2: string,
  threshold: number = 0.7
): boolean {
  const cosine = cosineSimilarity(topic1, topic2);
  const jaccard = jaccardSimilarity(topic1, topic2);

  // Use average of both metrics
  const avgSimilarity = (cosine + jaccard) / 2;

  return avgSimilarity >= threshold;
}

/**
 * Find similar topics in a list
 */
export function findSimilarTopics(
  topic: string,
  topics: string[],
  threshold: number = 0.7
): Array<{ topic: string; similarity: number }> {
  return topics
    .map((t) => ({
      topic: t,
      similarity: (cosineSimilarity(topic, t) + jaccardSimilarity(topic, t)) / 2,
    }))
    .filter((result) => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate statistical mean
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate statistical variance
 */
export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  return mean(values.map((val) => Math.pow(val - avg, 2)));
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}
