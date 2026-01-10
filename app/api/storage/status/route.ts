import { NextResponse } from 'next/server';
import { storage } from '@/lib/state/storage-factory';
import { KVStorageAdapter } from '@/lib/state/kv-store';
import { MemoryStorageAdapter } from '@/lib/state/memory-store';
import { JSONStorageAdapter } from '@/lib/state/json-store';

/**
 * GET /api/storage/status - Check which storage adapter is being used
 */
export async function GET() {
  try {
    // Determine which storage adapter is active
    const storageType = storage.constructor.name;
    const isKV = storage instanceof KVStorageAdapter;
    const isMemory = storage instanceof MemoryStorageAdapter;
    const isJSON = storage instanceof JSONStorageAdapter;

    // Check environment variables
    const hasKVUrl = !!process.env.KV_REST_API_URL;
    const hasKVToken = !!process.env.KV_REST_API_TOKEN;
    const isVercel = !!process.env.VERCEL;

    // Get storage stats
    let calendars: string[] = [];
    let personas = 0;
    let keywords = 0;
    let companyName = '';

    try {
      calendars = await storage.listCalendars();
      const personasData = await storage.loadPersonas();
      const keywordsData = await storage.loadKeywords();
      const company = await storage.loadCompanyInfo();

      personas = personasData.length;
      keywords = keywordsData.length;
      companyName = company.name || 'Not set';
    } catch (error) {
      console.log('Could not load storage stats:', error);
    }

    return NextResponse.json({
      storage: {
        type: storageType,
        isKV,
        isMemory,
        isJSON,
        ready: isKV ? hasKVUrl && hasKVToken : true,
      },
      environment: {
        hasKVUrl,
        hasKVToken,
        isVercel,
        kvUrlPrefix: hasKVUrl ? process.env.KV_REST_API_URL?.substring(0, 30) + '...' : undefined,
      },
      data: {
        company: companyName,
        personas,
        keywords,
        calendars: calendars.length,
        calendarIds: calendars.slice(0, 5), // First 5
      },
      status: isKV ? (hasKVUrl && hasKVToken ? 'KV_READY' : 'KV_MISCONFIGURED') :
              isMemory ? 'MEMORY_FALLBACK' : 'FILESYSTEM',
      message: isKV
        ? '✅ Using Upstash Redis (Vercel KV) - data persists'
        : isMemory
        ? '⚠️ Using in-memory storage - data will not persist. Set up Vercel KV!'
        : '📁 Using filesystem storage - good for local development',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get storage status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
