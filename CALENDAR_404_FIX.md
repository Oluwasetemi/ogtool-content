# Calendar 404 Error - Root Cause and Fix

## The Problem

When you try to fetch a calendar with `GET /api/calendar/{weekId}`, you get a 404 error saying "Calendar not found" even though you just generated it.

## Root Cause

**Memory Storage is Ephemeral in Serverless Environments**

Your app is currently using **MemoryStorageAdapter** because Vercel KV is not configured. Here's what happens:

```
1. Request A: Generate calendar
   ├─ Creates new function instance
   ├─ Initializes fresh MemoryStorageAdapter
   ├─ Generates calendar
   └─ Saves to memory: calendars.set('week-2026-01', calendar)

2. Function instance stays warm for ~5 minutes

3. Request B: Fetch calendar (within warm window)
   ├─ Uses SAME function instance
   ├─ Uses SAME MemoryStorageAdapter
   └─ ✅ Calendar found!

4. Function instance goes cold (inactive for >5 min)
   └─ Memory is cleared

5. Request C: Fetch calendar (after cold start)
   ├─ Creates NEW function instance
   ├─ Initializes NEW MemoryStorageAdapter (empty!)
   ├─ Tries to find calendar
   └─ ❌ Calendar not found! (404)
```

**In Short:**
- Memory storage only persists during the current function's lifetime
- Each cold start creates a fresh, empty memory store
- Calendars are lost when the function instance is recycled

## Solutions

### Quick Fix: Test During Warm Window

If you generate a calendar and immediately fetch it (within ~5 minutes), it will work because the function instance is still warm.

**Test:**
```bash
# Generate calendar
WEEK_ID=$(curl -X POST https://ogtool-content.vercel.app/api/calendar/generate \
  -H "Content-Type: application/json" \
  -d '{"minQualityScore": 7.0, "postsPerWeek": 3}' | jq -r '.calendar.weekId')

# Immediately fetch it (should work if within warm window)
curl https://ogtool-content.vercel.app/api/calendar/$WEEK_ID
```

### Permanent Fix: Set Up Vercel KV

The only real solution is to use persistent storage. Follow `SETUP_VERCEL_KV.md`:

**1. Create Vercel KV Database:**
```bash
# Via Vercel Dashboard
# Go to Storage → Create Database → KV
# Name: ogtool-storage
# Connect to your project
```

**2. Verify Connection:**
Once KV is connected, the logs will show:
```
✅ Using Upstash Redis (Vercel KV) storage - data persists across deployments
```

Instead of:
```
⚠️ Using in-memory storage (MemoryStorageAdapter) - data will not persist
```

**3. Seed Data:**
```bash
curl -X POST https://ogtool-content.vercel.app/api/seed
```

**4. Test:**
```bash
# Generate calendar (saves to KV)
WEEK_ID=$(curl -X POST ... | jq -r '.calendar.weekId')

# Wait 10 minutes (simulate cold start)
sleep 600

# Fetch calendar (should work! Data persists in KV)
curl https://ogtool-content.vercel.app/api/calendar/$WEEK_ID
```

## Debugging the 404

The improved error response now includes debugging info:

**Error Response:**
```json
{
  "error": "Calendar not found",
  "message": "Calendar not found: week-2026-01",
  "weekId": "week-2026-01",
  "availableCalendars": []  // Empty = fresh memory instance
}
```

**Production Logs:**
```
🔍 Looking for calendar: week-2026-01
   Calendars in memory: none
```

This confirms the memory store is empty (fresh instance after cold start).

## How to Check Current Storage

```bash
# Check which storage adapter is active
curl https://ogtool-content.vercel.app/api/seed
```

**If using Memory:**
```json
{
  "success": true,
  "message": "Filesystem storage detected - data already available from files",
  "data": {
    "company": true,
    "personas": 5,
    "keywords": 16
  }
}
```

**If using KV (after setup):**
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

## Why This Happens on Vercel

**Serverless Function Lifecycle:**
```
Cold Start (0-5 sec)
├─ Function instance created
├─ Code loaded
├─ Dependencies initialized
└─ MemoryStorageAdapter created (empty)

Warm Period (~5-15 min)
├─ Function stays in memory
├─ Subsequent requests reuse same instance
└─ Memory persists

Cold Again
├─ Function instance recycled
├─ Memory cleared
└─ Next request starts fresh
```

**Variables That Affect Cold Starts:**
- Time between requests (>5 min = likely cold)
- Traffic volume (high traffic = longer warm periods)
- Deployment (always cold start after deploy)
- Region (different regions = different instances)

## Comparison: Memory vs KV

| Feature | Memory Storage | Vercel KV |
|---------|---------------|-----------|
| Persistence | ❌ Ephemeral | ✅ Permanent |
| Cold starts | ❌ Data lost | ✅ Data persists |
| Deployments | ❌ Data lost | ✅ Data persists |
| State tracking | ❌ Unreliable | ✅ Reliable |
| Cost | ✅ Free | ✅ Free (Hobby tier) |
| Setup time | ✅ None | ⏱️ 5 minutes |
| Production ready | ❌ No | ✅ Yes |

## Recommended Action

**For Testing/Demo:**
- Current setup works if you test immediately after generation
- Be aware calendars may disappear after 5-15 minutes

**For Production:**
- **Set up Vercel KV** (see `SETUP_VERCEL_KV.md`)
- Takes 5 minutes
- Free tier sufficient for testing
- Enables proper state tracking and content diversity

## Verification After Fix

**1. Generate Calendar:**
```bash
curl -X POST https://ogtool-content.vercel.app/api/calendar/generate \
  -H "Content-Type: application/json" \
  -d '{"minQualityScore": 7.0, "postsPerWeek": 3}'
```

**2. Check Logs:**
```bash
vercel logs https://ogtool-content.vercel.app --follow
```

Look for:
```
✅ Using Upstash Redis (Vercel KV) storage
📝 Calendar saved to KV: week-2026-01
```

**3. List Calendars:**
```bash
curl https://ogtool-content.vercel.app/api/calendar
```

Should return array with your calendar.

**4. Fetch Specific Calendar:**
```bash
curl https://ogtool-content.vercel.app/api/calendar/week-2026-01
```

Should return the full calendar object, not 404.

**5. Wait and Test Again (After Cold Start):**
```bash
# Wait 10 minutes or trigger new deployment
# Then fetch again - should still work with KV!
curl https://ogtool-content.vercel.app/api/calendar/week-2026-01
```

## Summary

✅ **Problem Identified:** Memory storage is ephemeral in serverless
✅ **Debugging Added:** Logs and error responses show what's in memory
✅ **Quick Fix:** Test within warm window (~5 minutes)
🎯 **Permanent Fix:** Set up Vercel KV for persistent storage

The 404 is **expected behavior** with memory storage. For production use, Vercel KV is required.
