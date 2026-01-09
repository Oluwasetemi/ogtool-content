import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * GET /api/test-openai - Test OpenAI API connectivity
 */
export async function GET() {
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          message: 'Set OPENAI_API_KEY environment variable',
        },
        { status: 500 }
      );
    }

    console.log('Testing OpenAI API...');
    
    // Try a simple generation
    const { text } = await generateText({
      model: openai('gpt-4-turbo'),
      prompt: 'Say "Hello, OGTools!" in a friendly way.',
      temperature: 0.7,
      maxTokens: 50,
    });

    return NextResponse.json({
      success: true,
      message: 'OpenAI API is working',
      response: text,
      apiKeyConfigured: true,
    });
  } catch (error) {
    console.error('OpenAI test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'OpenAI API test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? {
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n'),
        } : undefined,
      },
      { status: 500 }
    );
  }
}
