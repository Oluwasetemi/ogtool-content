# Quick Upstash KV Setup (5 Minutes)

## Step 1: Create Vercel KV Database

**Via Vercel Dashboard:**

1. Go to https://vercel.com/dashboard
2. Select your project: `ogtool-content`
3. Click **Storage** tab (left sidebar)
4. Click **Create Database**
5. Select **KV** (Powered by Upstash Redis)
6. Configure:
   - **Name:** `ogtool-storage`
   - **Primary Region:** Same as your deployment (auto-suggested)
7. Click **Create**

## Step 2: Connect to Project

1. After creation, you'll see "Connect to Project"
2. Select **Project:** `ogtool-content`
3. Select **Environments:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. Click **Connect**

**This automatically adds these environment variables:**
- `KV_REST_API_URL` (e.g., `https://usw1-awesome-123.upstash.io`)
- `KV_REST_API_TOKEN` (your auth token)

## Step 3: Verify Connection

**Check Status:**
```bash
curl https://ogtool-content.vercel.app/api/storage/status
```

**Expected Response:**
```json
{
  "storage": {
    "type": "KVStorageAdapter",
    "isKV": true,
    "ready": true
  },
  "environment": {
    "hasKVUrl": true,
    "hasKVToken": true,
    "isVercel": true
  },
  "status": "KV_READY",
  "message": "✅ Using Upstash Redis (Vercel KV) - data persists"
}
```

**If you see `MEMORY_FALLBACK`:**
- Environment variables not set yet
- Redeploy your app or wait 2-3 minutes

## Step 4: Seed Initial Data

**Populate KV with company, personas, and keywords:**
```bash
curl -X POST https://ogtool-content.vercel.app/api/seed
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully seeded Vercel KV",
  "data": {
    "company": true,
    "personas": 5,
    "keywords": 16
  }
}
```

**Verify Data:**
```bash
curl https://ogtool-content.vercel.app/api/storage/status
```

Should now show:
```json
{
  "data": {
    "company": "SlideForge",
    "personas": 5,
    "keywords": 16,
    "calendars": 0
  }
}
```

## Step 5: Generate First Calendar

```bash
curl -X POST https://ogtool-content.vercel.app/api/calendar/generate \
  -H "Content-Type: application/json" \
  -d '{"minQualityScore": 7.0, "postsPerWeek": 3}'
```

**Watch Logs:**
```bash
vercel logs https://ogtool-content.vercel.app --follow
```

**Look for:**
```
✅ Using Upstash Redis (Vercel KV) storage - data persists across deployments
Phase 1: Generating post structure...
Generated 3 posts
...
Calendar generated successfully with score 8.6/10
```

## Step 6: Verify Persistence

**List Calendars:**
```bash
curl https://ogtool-content.vercel.app/api/calendar
```

**Get Specific Calendar:**
```bash
curl https://ogtool-content.vercel.app/api/calendar/week-2026-01
```

**Test Persistence After Cold Start:**
```bash
# Wait 10 minutes or trigger new deployment
# Then fetch calendar again - should still work!
curl https://ogtool-content.vercel.app/api/calendar/week-2026-01
```

✅ **If it works after waiting, KV is properly set up!**

## Troubleshooting

### Issue: Still seeing "MEMORY_FALLBACK"

**Solutions:**
1. Verify KV database is created in Vercel dashboard
2. Check it's connected to your project
3. Verify environment variables are set:
   - Settings → Environment Variables
   - Look for `KV_REST_API_URL` and `KV_REST_API_TOKEN`
4. Trigger new deployment:
   ```bash
   git commit --allow-empty -m "redeploy"
   git push
   ```

### Issue: "Failed to seed KV"

**Solutions:**
1. Check if data files exist in repo:
   ```bash
   ls data/
   # Should show: company.json, personas.json, keywords.json
   ```
2. Try seeding again (endpoint is idempotent)

### Issue: Calendars still return 404

**Solutions:**
1. Verify storage status shows `KV_READY`
2. Check seed was successful
3. Generate new calendar after seeding
4. Check logs for KV connection errors

## Verify Everything Works

**Run this test sequence:**

```bash
# 1. Check storage
curl https://ogtool-content.vercel.app/api/storage/status

# 2. Seed data (if needed)
curl -X POST https://ogtool-content.vercel.app/api/seed

# 3. Generate calendar
WEEK_ID=$(curl -s -X POST https://ogtool-content.vercel.app/api/calendar/generate \
  -H "Content-Type: application/json" \
  -d '{"minQualityScore": 7.0, "postsPerWeek": 3}' | jq -r '.calendar.weekId')

echo "Generated: $WEEK_ID"

# 4. List calendars
curl https://ogtool-content.vercel.app/api/calendar

# 5. Fetch specific calendar
curl https://ogtool-content.vercel.app/api/calendar/$WEEK_ID

# 6. Wait and fetch again (test persistence)
echo "Waiting 30 seconds to simulate cold start..."
sleep 30
curl https://ogtool-content.vercel.app/api/calendar/$WEEK_ID

# ✅ If this works, KV is set up correctly!
```

## Local Development

To use KV locally:

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Verify .env.local has:
cat .env.local
# Should show:
# KV_REST_API_URL="https://..."
# KV_REST_API_TOKEN="..."
# OPENAI_API_KEY="sk-..."

# Run locally (will connect to production KV!)
npm run dev
```

## Environment Variables Reference

| Variable | Description | Set By | Required |
|----------|-------------|---------|----------|
| `KV_REST_API_URL` | Upstash Redis endpoint | Vercel (auto) | ✅ Yes |
| `KV_REST_API_TOKEN` | Auth token | Vercel (auto) | ✅ Yes |
| `OPENAI_API_KEY` | OpenAI API key | You (manual) | ✅ Yes |

## What Gets Stored in KV

**Keys:**
```
ogtools:state                    → Global state
ogtools:company                  → Company info
ogtools:personas                 → Personas array
ogtools:keywords                 → Keywords array
ogtools:calendar:week-2026-01    → Calendar data
ogtools:calendars:list           → Set of calendar IDs
```

**Storage Usage:**
- ~1 KB per calendar
- ~10 KB for company/personas/keywords
- Free tier: 256 MB (enough for ~250,000 calendars)

## Success Criteria

✅ Storage status shows `KV_READY`
✅ Seed endpoint succeeds
✅ Calendar generation succeeds
✅ Calendar fetch works
✅ Calendar persists after cold start (wait 10+ minutes and fetch again)

## Next Steps

After KV is set up:
- ✅ Generate multiple calendars to test quota tracking
- ✅ Verify different personas are used (rotation works)
- ✅ Check quality metrics accumulate over time
- ✅ Test export functionality

## Summary

**Before:** Memory storage (ephemeral, data lost on cold starts)
**After:** Upstash Redis/KV (persistent, production-ready)

**Setup Time:** ~5 minutes
**Cost:** Free (Hobby tier)
**Benefits:** Full state persistence, better content quality
