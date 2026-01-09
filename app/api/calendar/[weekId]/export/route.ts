import { NextResponse } from 'next/server';
import { loadCalendar, exportCalendarToCSV } from '@/lib/core/calendar-generator';

/**
 * GET /api/calendar/[weekId]/export - Export calendar to CSV
 */
export async function GET(
  request: Request,
  { params }: { params: { weekId: string } }
) {
  try {
    const calendar = await loadCalendar(params.weekId);
    const csv = exportCalendarToCSV(calendar);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${params.weekId}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting calendar:', error);
    return NextResponse.json(
      {
        error: 'Failed to export calendar',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
