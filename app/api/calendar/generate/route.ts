import { NextResponse } from 'next/server';
import { generateAndSaveCalendar } from '@/lib/core/calendar-generator';
import { jsonStorage } from '@/lib/state/json-store';

/**
 * POST /api/calendar/generate - Generate a new calendar
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { minQualityScore = 7.0, postsPerWeek = 3 } = body;

    // Validate inputs
    if (minQualityScore < 0 || minQualityScore > 10) {
      return NextResponse.json(
        { error: 'minQualityScore must be between 0 and 10' },
        { status: 400 }
      );
    }

    if (postsPerWeek < 1 || postsPerWeek > 10) {
      return NextResponse.json(
        { error: 'postsPerWeek must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Load configuration
    const companyInfo = await jsonStorage.loadCompanyInfo();
    const personas = await jsonStorage.loadPersonas();
    const keywords = await jsonStorage.loadKeywords();

    // Generate calendar
    const calendar = await generateAndSaveCalendar(
      {
        companyInfo: {
          ...companyInfo,
          postsPerWeek,
        },
        personas,
        subreddits: companyInfo.subreddits,
        keywords,
        postsPerWeek,
        minQualityScore,
      },
      minQualityScore
    );

    return NextResponse.json({
      success: true,
      calendar: {
        weekId: calendar.weekId,
        startDate: calendar.startDate,
        status: calendar.status,
        postCount: calendar.posts.length,
        commentCount: calendar.comments.length,
        qualityScore: calendar.qualityScore,
        posts: calendar.posts,
        comments: calendar.comments,
      },
    });
  } catch (error) {
    console.error('Error generating calendar:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate calendar',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
