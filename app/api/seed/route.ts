import { NextResponse } from 'next/server';
import { storage } from '@/lib/state/storage-factory';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * POST /api/seed - Seed Vercel KV with initial data from JSON files
 * This endpoint reads data from the /data directory and populates KV
 */
export async function POST() {
  try {
    const dataDir = path.join(process.cwd(), 'data');

    // Load company info
    let company;
    try {
      const companyData = await fs.readFile(
        path.join(dataDir, 'company.json'),
        'utf-8'
      );
      company = JSON.parse(companyData);
    } catch (error) {
      console.log('No company.json found, using defaults');
    }

    // Load personas
    let personas = [];
    try {
      const personasData = await fs.readFile(
        path.join(dataDir, 'personas.json'),
        'utf-8'
      );
      personas = JSON.parse(personasData);
    } catch (error) {
      console.log('No personas.json found');
    }

    // Load keywords
    let keywords = [];
    try {
      const keywordsData = await fs.readFile(
        path.join(dataDir, 'keywords.json'),
        'utf-8'
      );
      keywords = JSON.parse(keywordsData);
    } catch (error) {
      console.log('No keywords.json found');
    }

    // Seed storage with data (works with any adapter)
    if ('seedData' in storage && typeof storage.seedData === 'function') {
      await storage.seedData({
        company,
        personas,
        keywords,
      });
    } else {
      // For adapters without seedData method, we can't seed
      // This is expected for JSONStorageAdapter which uses file system directly
      return NextResponse.json({
        success: true,
        message: 'Filesystem storage detected - data already available from files',
        data: {
          company: !!company,
          personas: personas.length,
          keywords: keywords.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully seeded Vercel KV',
      data: {
        company: !!company,
        personas: personas.length,
        keywords: keywords.length,
      },
    });
  } catch (error) {
    console.error('Error seeding KV:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed KV',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/seed - Check seeding status
 */
export async function GET() {
  try {
    const company = await storage.loadCompanyInfo();
    const personas = await storage.loadPersonas();
    const keywords = await storage.loadKeywords();
    const calendars = await storage.listCalendars();

    return NextResponse.json({
      success: true,
      data: {
        company: {
          name: company.name,
          configured: !!company.subreddits && company.subreddits.length > 0,
        },
        personas: personas.length,
        keywords: keywords.length,
        calendars: calendars.length,
      },
      message: 'KV storage is configured',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check KV status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
