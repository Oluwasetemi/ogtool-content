import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * GET /api/test/openai - Test OpenAI API connection
 */
export async function GET() {
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'OPENAI_API_KEY not configured',
          message: 'Please set OPENAI_API_KEY in Vercel environment variables',
        },
        { status: 500 }
      );
    }

    // Test API key format
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('API Key prefix:', apiKey.substring(0, 7));
    console.log('API Key length:', apiKey.length);

    // Make a simple test call
    console.log('Testing OpenAI API connection...');
    const startTime = Date.now();

    const { text } = await generateText({
      model: openai('gpt-4-turbo'),
      prompt: 'Say "Hello, Claude!" in 2 words.',
      maxTokens: 10,
      temperature: 0.1,
    });

    const duration = Date.now() - startTime;

    console.log('OpenAI API test successful');
    console.log('Response:', text);
    console.log('Duration:', duration, 'ms');

    return NextResponse.json({
      success: true,
      message: 'OpenAI API connection successful',
      response: text,
      duration,
      apiKeyPrefix: apiKey.substring(0, 7),
      apiKeyLength: apiKey.length,
    });
  } catch (error) {
    console.error('OpenAI API test failed:', error);

    const errorDetails: any = {
      success: false,
      error: 'OpenAI API test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };

    if (error instanceof Error) {
      errorDetails.errorName = error.name;
      errorDetails.errorMessage = error.message;
      errorDetails.errorStack = error.stack?.split('\n').slice(0, 3).join('\n');
    }

    // Check for specific error types
    if (error && typeof error === 'object') {
      if ('status' in error) {
        errorDetails.httpStatus = (error as any).status;
      }
      if ('code' in error) {
        errorDetails.errorCode = (error as any).code;
      }
      if ('type' in error) {
        errorDetails.errorType = (error as any).type;
      }
    }

    return NextResponse.json(errorDetails, { status: 500 });
  }
}
