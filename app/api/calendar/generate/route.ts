import { NextResponse } from 'next/server';
import { generateAndSaveCalendar } from '@/lib/core/calendar-generator';
import { storage } from '@/lib/state/storage-factory';

/**
 * POST /api/calendar/generate - Generate a new calendar
 */
export async function POST(request: Request) {
  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          message: 'Please set OPENAI_API_KEY environment variable in Vercel dashboard.',
        },
        { status: 500 }
      );
    }

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
    const companyInfo = await storage.loadCompanyInfo();
    const personas = await storage.loadPersonas();
    const keywords = await storage.loadKeywords();

    // Validate required data
    if (!personas || personas.length === 0) {
      return NextResponse.json(
        { 
          error: 'No personas configured',
          message: 'Please set up personas in your storage. Visit /api/seed to initialize data.',
        },
        { status: 400 }
      );
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { 
          error: 'No keywords configured',
          message: 'Please set up keywords in your storage. Visit /api/seed to initialize data.',
        },
        { status: 400 }
      );
    }

    if (!companyInfo.subreddits || companyInfo.subreddits.length === 0) {
      return NextResponse.json(
        { 
          error: 'No subreddits configured',
          message: 'Please configure subreddits in your company settings.',
        },
        { status: 400 }
      );
    }

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
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      {
        error: 'Failed to generate calendar',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? {
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        } : undefined,
      },
      { status: 500 }
    );
  }
}
