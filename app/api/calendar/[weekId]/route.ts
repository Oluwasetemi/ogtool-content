import { NextResponse } from 'next/server';
import { loadCalendar, approveCalendar } from '@/lib/core/calendar-generator';

/**
 * GET /api/calendar/[weekId] - Get a specific calendar
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params;

    console.log(`Fetching calendar: ${weekId}`);

    // Try to load the calendar
    const calendar = await loadCalendar(weekId);

    console.log(`Calendar found: ${calendar.weekId}, posts: ${calendar.posts.length}`);

    return NextResponse.json({ calendar });
  } catch (error) {
    console.error(`Calendar not found: ${(await params).weekId}`);
    console.error('Error details:', error);

    // List available calendars for debugging
    const { storage } = await import('@/lib/state/storage-factory');
    const availableCalendars = await storage.listCalendars();
    console.log('Available calendars:', availableCalendars);

    return NextResponse.json(
      {
        error: 'Calendar not found',
        message: error instanceof Error ? error.message : 'Unknown error',
        weekId: (await params).weekId,
        availableCalendars,
      },
      { status: 404 }
    );
  }
}

/**
 * PATCH /api/calendar/[weekId] - Update calendar status
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      const calendar = await approveCalendar(weekId);
      return NextResponse.json({
        success: true,
        calendar,
        message: 'Calendar approved successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: approve' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating calendar:', error);
    return NextResponse.json(
      {
        error: 'Failed to update calendar',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
