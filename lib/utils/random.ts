import { WeightedOption } from '../core/types';

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Select a random element from an array
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Weighted random selection from an array of options
 */
export function weightedRandomSelect<T>(
  options: WeightedOption<T>[],
  excludeRecent?: T[]
): T {
  // Filter out recently used options if provided
  let filteredOptions = options;
  if (excludeRecent && excludeRecent.length > 0) {
    filteredOptions = options.filter(
      (opt) => !excludeRecent.includes(opt.value)
    );
  }

  // If all options were filtered out, use original options
  if (filteredOptions.length === 0) {
    filteredOptions = options;
  }

  // Calculate total weight
  const totalWeight = filteredOptions.reduce((sum, opt) => sum + opt.weight, 0);

  // Generate random value
  let random = Math.random() * totalWeight;

  // Select based on weight
  for (const option of filteredOptions) {
    random -= option.weight;
    if (random <= 0) {
      return option.value;
    }
  }

  // Fallback (shouldn't reach here)
  return filteredOptions[filteredOptions.length - 1].value;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a random duration in minutes within a range
 */
export function randomMinutes(min: number, max: number): number {
  return randomInt(min, max);
}

/**
 * Add random variance to a number (±variance%)
 */
export function addVariance(value: number, variancePercent: number): number {
  const variance = value * (variancePercent / 100);
  return value + randomFloat(-variance, variance);
}

/**
 * Random boolean with given probability (0-1)
 */
export function randomBoolean(probability: number = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * Select N random elements from array without replacement
 */
export function randomSample<T>(array: T[], n: number): T[] {
  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(n, array.length));
}

/**
 * Generate a random ID with prefix and number
 */
export function generateId(prefix: string, counter?: number): string {
  if (counter !== undefined) {
    return `${prefix}${counter}`;
  }
  return `${prefix}${randomInt(1000, 9999)}`;
}

/**
 * Generate a week ID based on date
 */
export function generateWeekId(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const week = getWeekNumber(d);
  return `week-${year}-${String(week).padStart(2, '0')}`;
}

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
