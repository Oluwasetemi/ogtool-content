import { WeeklyCalendar, Persona } from '../core/types';
import { mean } from '../utils/similarity';

/**
 * Consistency Scoring - Ensure personas maintain their voice
 * Target: 8.5+ for authentic voices
 */

export function scoreConsistency(calendar: WeeklyCalendar): number {
  let score = 10.0;

  // Get unique personas in this calendar
  const personas = getUniquePersonas(calendar);

  personas.forEach((username) => {
    const penalty = checkPersonaConsistency(calendar, username);
    score -= penalty;
  });

  return Math.max(0, Math.min(10, score));
}

function getUniquePersonas(calendar: WeeklyCalendar): string[] {
  const personas = new Set<string>();
  calendar.posts.forEach((p) => personas.add(p.author_username));
  calendar.comments.forEach((c) => personas.add(c.username));
  return Array.from(personas);
}

function checkPersonaConsistency(calendar: WeeklyCalendar, username: string): number {
  // Get all text from this persona
  const posts = calendar.posts.filter((p) => p.author_username === username);
  const comments = calendar.comments.filter((c) => c.username === username);

  const allText = [
    ...posts.map((p) => p.title + ' ' + p.body),
    ...comments.map((c) => c.comment_text),
  ].filter((t) => t.trim().length > 0);

  if (allText.length === 0) return 0;

  let penalty = 0;

  // Check 1: Sentence length consistency
  const sentenceLengths = allText.map((text) => {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    return mean(sentences.map((s) => s.trim().split(/\s+/).length));
  });

  const avgLength = mean(sentenceLengths);

  // Check if consistent with expected range
  // This is simplified - in real implementation, would check against persona voice profile
  if (avgLength < 5 || avgLength > 30) {
    penalty += 0.3; // Unusual sentence length
  }

  // Check 2: Casualness consistency
  const casualMarkers = ['lol', 'tbh', 'yea', 'sorta', 'gonna', 'wanna'];
  const casualCounts = allText.map((text) => {
    return casualMarkers.filter((marker) => text.toLowerCase().includes(marker)).length;
  });
  const casualRatio = mean(casualCounts) / allText.length;

  // Check 3: Out-of-character language
  const professionalMarkers = ['optimize', 'leverage', 'utilize', 'synergy'];
  const studentMarkers = ['dude', 'literally', 'like'];

  // Simplified check - would need to map to specific personas
  const hasProfessionalSpeak = allText.some((text) =>
    professionalMarkers.some((m) => text.toLowerCase().includes(m))
  );

  const hasStudentSpeak = allText.some((text) =>
    studentMarkers.some((m) => text.toLowerCase().includes(m))
  );

  // Mixed signals = inconsistent
  if (hasProfessionalSpeak && hasStudentSpeak) {
    penalty += 0.5;
  }

  return penalty;
}
