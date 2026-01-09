import { NextResponse } from 'next/server';
import { listCalendars, loadCalendar } from '@/lib/core/calendar-generator';

/**
 * GET /api/calendar - List all calendars
 */
export async function GET() {
  try {
    const weekIds = await listCalendars();

    // Load all calendars with basic info
    const calendars = await Promise.all(
      weekIds.map(async (weekId) => {
        const calendar = await loadCalendar(weekId);
        return {
          weekId: calendar.weekId,
          startDate: calendar.startDate,
          status: calendar.status,
          postCount: calendar.posts.length,
          commentCount: calendar.comments.length,
          qualityScore: calendar.qualityScore.overall,
          generatedAt: calendar.metadata.generatedAt,
        };
      })
    );

    // Sort by date (newest first)
    calendars.sort((a, b) => b.generatedAt - a.generatedAt);

    return NextResponse.json({ calendars });
  } catch (error) {
    console.error('Error listing calendars:', error);
    return NextResponse.json(
      { error: 'Failed to list calendars' },
      { status: 500 }
    );
  }
}
