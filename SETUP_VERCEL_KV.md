# Setting Up Vercel KV (Upstash Redis) Storage

This guide will help you set up persistent storage using Upstash Redis through Vercel KV.

## Why Vercel KV?

**Current State: In-Memory Storage**
- ⚠️ Data resets on every deployment
- ⚠️ State doesn't persist between requests (cold starts)
- ⚠️ Persona quotas and subreddit rotation don't work properly

**With Vercel KV:**
- ✅ Data persists across deployments
- ✅ State maintained between all requests
- ✅ Persona quotas track correctly
- ✅ Subreddit rotation works as designed
- ✅ Quality metrics accumulate over time
- ✅ Better content diversity

## Setup Instructions

### Step 1: Create Vercel KV Database

**Via Vercel Dashboard:**

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Select your project (`ogtool-content`)
3. Click on **Storage** tab in the left sidebar
4. Click **Create Database**
5. Select **KV** (Redis-compatible)
6. Configure:
   - **Name:** `ogtool-storage` (or any name you prefer)
   - **Region:** Choose same region as your deployment (auto-recommended)
   - **Primary Region:** `us-east-1` or closest to your users
7. Click **Create**

**Via Vercel CLI:**

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Create KV database
vercel kv create ogtool-storage
```

### Step 2: Connect to Your Project

**Automatic (Recommended):**

1. After creating the KV database, click **Connect to Project**
2. Select your project: `ogtool-content`
3. Select environment: **Production**, **Preview**, **Development** (check all)
4. Click **Connect**

This automatically adds these environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN` (optional)
- `KV_URL` (optional, for Redis client)

**Manual:**

If you need to manually add environment variables:

1. Go to **Settings** → **Environment Variables**
2. Add:
   - **Variable:** `KV_REST_API_URL`
   - **Value:** `https://your-region.upstash.io`
   - **Environments:** Production, Preview, Development
3. Add:
   - **Variable:** `KV_REST_API_TOKEN`
   - **Value:** Your Upstash token
   - **Environments:** Production, Preview, Development

### Step 3: Deploy

The environment variables are now set. Deploy your project:

```bash
# Trigger a new deployment
git commit --allow-empty -m "Enable Vercel KV storage"
git push
```

Or use the Vercel CLI:

```bash
vercel --prod
```

### Step 4: Verify Setup

**Check Deployment Logs:**

```bash
vercel logs https://ogtool-content.vercel.app --follow
```

**Look for:**
```
✅ Using Upstash Redis (Vercel KV) storage - data persists across deployments
```

Instead of:
```
⚠️ Using in-memory storage (MemoryStorageAdapter) - data will not persist
```

**Test Calendar Generation:**

Visit your app and generate a calendar. The logs should show:
```
✅ Using Upstash Redis (Vercel KV) storage
State loaded from KV
Calendar saved to KV: week-2026-01
```

### Step 5: Seed Initial Data

You'll need to populate the KV database with your company info, personas, and keywords.

**Option A: Create a Seed Endpoint**

We can create an API endpoint to seed data:

```typescript
// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { kvStorage } from '@/lib/state/kv-store';
import companyData from '@/data/company.json';
import personasData from '@/data/personas.json';
import keywordsData from '@/data/keywords.json';

export async function POST() {
  try {
    await kvStorage.seedData({
      company: companyData,
      personas: personasData,
      keywords: keywordsData,
    });

    return NextResponse.json({
      success: true,
      message: 'Data seeded successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

Then call it once:
```bash
curl -X POST https://ogtool-content.vercel.app/api/seed
```

**Option B: Use Upstash Console**

1. Go to Upstash Console: https://console.upstash.com
2. Select your database
3. Use the **Data Browser** to manually add keys:
   - `ogtools:company` → Your company JSON
   - `ogtools:personas` → Your personas JSON array
   - `ogtools:keywords` → Your keywords JSON array

## Environment Variables Reference

### Required for Upstash Redis (Vercel KV)

| Variable | Description | Set By |
|----------|-------------|---------|
| `KV_REST_API_URL` | Upstash Redis REST API URL | Vercel (auto) |
| `KV_REST_API_TOKEN` | Upstash Redis auth token | Vercel (auto) |

### Still Required

| Variable | Description | Set By |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for text generation | You (manual) |

## Local Development

To test KV storage locally:

1. Copy environment variables from Vercel:
   ```bash
   vercel env pull .env.local
   ```

2. Your `.env.local` should now have:
   ```env
   KV_REST_API_URL=https://...upstash.io
   KV_REST_API_TOKEN=...
   OPENAI_API_KEY=sk-...
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

4. The app will connect to the **same** Vercel KV database as production

## Implementation Details

### Storage Adapter Priority

The system automatically selects the best available storage:

```typescript
1. Upstash Redis (KV) ← Best for production
   ↓ (if KV_REST_API_URL not set)
2. Filesystem (JSON)  ← Good for local development
   ↓ (if on Vercel/serverless)
3. Memory (fallback)  ← Current state, data doesn't persist
```

### What Gets Stored in KV

**Keys:**
- `ogtools:state` - Global state (quotas, patterns, metrics)
- `ogtools:company` - Company information
- `ogtools:personas` - Array of persona objects
- `ogtools:keywords` - Array of keyword objects
- `ogtools:calendar:{weekId}` - Individual calendar data
- `ogtools:calendars:list` - Set of all calendar IDs

**Data Structure:**
```typescript
{
  "ogtools:state": {
    history: { weeks: [], totalPosts: 0, totalComments: 0 },
    quotas: { personaUsage: {}, subredditUsage: {}, keywordUsage: {} },
    patterns: { personaPairings: {}, subredditRotation: [], timingPatterns: [] },
    qualityMetrics: { ... }
  },
  "ogtools:calendar:week-2026-01": {
    weekId: "week-2026-01",
    posts: [...],
    comments: [...],
    qualityScore: { overall: 8.6, ... },
    status: "draft"
  }
}
```

## Pricing

**Vercel KV Pricing:**

- **Hobby Plan (Free):**
  - 256 MB storage
  - 10,000 commands/day
  - Sufficient for testing/MVP

- **Pro Plan ($20/month):**
  - 512 MB storage
  - 100,000 commands/day
  - Good for production

- **Enterprise:**
  - Custom limits
  - Contact Vercel sales

**Typical Usage for This App:**
- ~100 commands per calendar generation
- ~1 KB per calendar stored
- Free tier supports ~100 calendar generations/day

## Troubleshooting

### Issue 1: Still Using Memory Storage

**Symptoms:**
```
⚠️ Using in-memory storage (MemoryStorageAdapter) - data will not persist
```

**Solutions:**
1. Verify environment variables are set in Vercel dashboard
2. Check that KV database is connected to your project
3. Redeploy: `git commit --allow-empty -m "test" && git push`
4. Check logs: `vercel logs --follow`

### Issue 2: "Redis initialization failed"

**Symptoms:**
```
Error: Redis initialization failed
```

**Solutions:**
1. Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set correctly
2. Check Upstash console that database is active
3. Try recreating the connection in Vercel dashboard

### Issue 3: "Company data not found"

**Symptoms:**
```
Error: Company info not found in KV
```

**Solutions:**
1. Seed data using the seed endpoint (Option A above)
2. Manually add data in Upstash console (Option B above)
3. Check key name: should be `ogtools:company`

### Issue 4: Local development not connecting

**Symptoms:**
```
⚠️ Using in-memory storage locally
```

**Solutions:**
1. Pull environment variables: `vercel env pull .env.local`
2. Verify `.env.local` has `KV_REST_API_URL` and `KV_REST_API_TOKEN`
3. Restart dev server: `npm run dev`

## Migration from Memory to KV

When you switch from memory to KV storage:

**What Changes:**
- ✅ State persists between requests
- ✅ Calendars are saved permanently
- ✅ Persona quotas accumulate correctly

**What Stays the Same:**
- ✅ Same API endpoints
- ✅ Same UI
- ✅ No code changes needed

**Data Migration:**
- Memory storage has no data to migrate (it's ephemeral)
- KV starts fresh with empty state
- Seed initial data as described in Step 5

## Testing After Setup

**1. Generate a Calendar:**
```bash
curl -X POST https://ogtool-content.vercel.app/api/calendar/generate \
  -H "Content-Type: application/json" \
  -d '{"minQualityScore": 7.0, "postsPerWeek": 3}'
```

**2. List Calendars:**
```bash
curl https://ogtool-content.vercel.app/api/calendar
```

**3. Get Specific Calendar:**
```bash
curl https://ogtool-content.vercel.app/api/calendar/week-2026-01
```

**4. Check State Persistence:**
Generate 2 calendars in a row and verify:
- Different personas are used (quota tracking works)
- Different subreddits are selected (rotation works)
- Quality metrics show cumulative data

## Summary

✅ **Before:** Memory storage (ephemeral, resets on every deployment)
✅ **After:** Upstash Redis/KV (persistent, production-ready)

**Setup Time:** ~5 minutes
**Cost:** Free (Hobby plan)
**Benefits:** Full state persistence, better content quality

## Next Steps

After KV is set up:
1. ✅ Data persists across deployments
2. ✅ Generate multiple calendars to test quota tracking
3. ✅ Monitor quality metrics over time
4. ✅ Consider upgrading to Pro plan if you exceed free tier limits

For questions or issues, see the Upstash documentation:
- https://docs.upstash.com/redis
- https://vercel.com/docs/storage/vercel-kv
