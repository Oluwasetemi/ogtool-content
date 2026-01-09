# Production Error Troubleshooting Guide

## Current Issue: "Attempt 3 failed" Error

### Diagnostic Steps

#### 1. Test OpenAI API Connection
Visit: `https://ogtool-content.vercel.app/api/test/openai`

This will test:
- ✅ OPENAI_API_KEY is configured
- ✅ API key format is valid
- ✅ OpenAI API is responding
- ✅ Response time

**Expected Response:**
```json
{
  "success": true,
  "message": "OpenAI API connection successful",
  "response": "Hello, Claude!",
  "duration": 1500,
  "apiKeyPrefix": "sk-proj",
  "apiKeyLength": 51
}
```

**If this fails:**
- Check that OPENAI_API_KEY is set in Vercel dashboard
- Verify the key is valid and has not expired
- Check OpenAI account has credits

#### 2. Check Vercel Function Timeout

**Updated Configuration:**
- Created `vercel.json` with 300 second timeout
- Default Vercel timeout is 10s (hobby) or 60s (pro)
- Calendar generation requires 30-60 seconds

**Action Required:**
1. Commit and push the new `vercel.json` file
2. Redeploy to Vercel
3. Verify deployment picked up the configuration

#### 3. Check Vercel Logs for Complete Error

**Current Log (Incomplete):**
```
Attempt 3 failed:
```

**What's Missing:**
The actual error message is cut off. We need the full error.

**How to Get Full Logs:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Get real-time logs
vercel logs https://ogtool-content.vercel.app --follow

# Or check specific deployment
vercel logs [deployment-url]
```

**Look for:**
- Error name (e.g., `TypeError`, `OpenAIError`, `TimeoutError`)
- Error message (e.g., "Rate limit exceeded", "Invalid API key")
- Error stack trace
- HTTP status codes (429 = rate limit, 401 = auth, 500 = server error)

### Common Causes & Solutions

#### Issue 1: Vercel Function Timeout
**Symptoms:**
- Generation fails after ~10-60 seconds
- No specific error message
- Logs show process was killed

**Solution:**
✅ **Already Fixed** - Added `vercel.json` with 300s timeout

**Verify Fix:**
1. Check `vercel.json` exists in repo
2. Commit and push to GitHub
3. Verify Vercel deployment includes the file
4. Check deployment logs for "Using configuration from vercel.json"

#### Issue 2: OpenAI Rate Limiting
**Symptoms:**
- Error: "Rate limit exceeded"
- HTTP status: 429
- Intermittent failures

**Solution:**
1. Check OpenAI usage limits at https://platform.openai.com/usage
2. Upgrade OpenAI account tier if needed
3. Add retry logic with exponential backoff (TODO)

#### Issue 3: Invalid OpenAI API Key
**Symptoms:**
- Error: "Invalid API key" or "Authentication failed"
- HTTP status: 401
- Consistent failures

**Solution:**
1. Go to Vercel dashboard → Your Project → Settings → Environment Variables
2. Verify `OPENAI_API_KEY` is set
3. Verify it starts with `sk-` and is ~50+ characters
4. Test with `/api/test/openai` endpoint
5. If invalid, create new key at https://platform.openai.com/api-keys

#### Issue 4: Missing Data Files (Personas/Keywords)
**Symptoms:**
- Error: "Cannot read property 'find' of undefined"
- Error: "personas is undefined"
- State shows different values between attempts

**Solution:**
1. Check if `/api/seed` endpoint exists to initialize data
2. Verify Vercel has access to data files
3. **Important:** Vercel file system is read-only in production
   - Solution: Use environment variables or Vercel Blob/KV
   - Or: Use Supabase as documented in IMPLEMENTATION.md

#### Issue 5: Vercel File System Access
**Symptoms:**
- State loading inconsistently
- "ENOENT" or "EACCES" file errors
- First attempt fails, subsequent attempts work

**Current Storage:**
- Using JSON files in `/data` directory
- ⚠️ Vercel file system is **ephemeral** and **read-only** in production

**Solution:**
Migrate to persistent storage ASAP:

**Option A: Vercel KV (Redis)**
```bash
# Install
npm install @vercel/kv

# Set in Vercel dashboard
VERCEL_KV_URL=...
```

**Option B: Supabase (Recommended)**
See IMPLEMENTATION.md for migration guide

**Option C: Environment Variables (Quick Fix)**
Move persona/keyword data to environment variables temporarily:
```env
PERSONA_DATA={"personas": [...]}
KEYWORD_DATA={"keywords": [...]}
```

### Enhanced Error Logging

**What I Added:**

1. **Better AI Error Logging** (`lib/ai/text-generator.ts`)
   - Error name, message, and stack trace
   - OpenAI API status codes
   - Response details

2. **Environment Validation** (`lib/utils/env-check.ts`)
   - Validates OPENAI_API_KEY format
   - Checks for common misconfigurations
   - Logs Vercel region and environment

3. **Test Endpoint** (`/api/test/openai`)
   - Quick diagnostic for OpenAI connection
   - Returns API key validation
   - Measures response time

### Next Steps

1. **Immediate Actions:**
   ```bash
   # 1. Commit and push vercel.json
   git add UI/vercel.json
   git commit -m "Add Vercel timeout configuration"
   git push

   # 2. Check full error logs
   vercel logs https://ogtool-content.vercel.app --follow

   # 3. Test OpenAI connection
   curl https://ogtool-content.vercel.app/api/test/openai
   ```

2. **Verify Environment:**
   - Vercel Dashboard → Project Settings → Environment Variables
   - Confirm `OPENAI_API_KEY` is set for Production
   - Value should start with `sk-` and be ~50+ characters

3. **Test Locally:**
   ```bash
   cd UI
   cp .env.example .env.local
   # Add your OPENAI_API_KEY
   npm install
   npm run dev
   # Visit http://localhost:3000/api/test/openai
   # Try generating a calendar
   ```

4. **Monitor Deployment:**
   - After pushing changes, wait for Vercel to redeploy
   - Check deployment logs for "vercel.json" configuration
   - Try generation again
   - Get full error logs with `vercel logs --follow`

### Expected Resolution

**Most Likely Cause:**
Based on your logs showing "Attempt 3 failed" with no error message, this is likely:
1. **Vercel timeout** (10s default killed the process)
2. **OpenAI rate limiting** (429 errors being swallowed)

**Fix Applied:**
- ✅ Increased timeout to 300s via `vercel.json`
- ✅ Enhanced error logging for diagnostics
- ✅ Added environment validation
- ✅ Created test endpoint

**After Deploying Fix:**
You should see either:
- ✅ Generation succeeds (timeout was the issue)
- ❌ Detailed error message (helps diagnose further)

### Getting Help

If the issue persists after applying these fixes:

1. **Share Full Error:**
   ```bash
   vercel logs --follow
   # Copy the complete error message
   ```

2. **Share Test Results:**
   ```bash
   curl https://ogtool-content.vercel.app/api/test/openai
   # Copy the response
   ```

3. **Check Vercel Dashboard:**
   - Functions tab → See function duration
   - Logs tab → See real-time errors
   - Settings → Environment Variables

4. **Verify Deployment:**
   ```bash
   # Check if vercel.json was deployed
   curl https://ogtool-content.vercel.app/vercel.json
   # Should return the config or 404 if not public
   ```

### Migration to Production-Ready Storage

**Current Issue:**
JSON file storage doesn't work on Vercel (read-only, ephemeral file system)

**Recommended Fix:**
Migrate to Supabase (see `IMPLEMENTATION.md` for full guide)

**Quick Migration Steps:**
1. Create Supabase project
2. Run database migrations
3. Set environment variables:
   ```env
   STORAGE_ADAPTER=supabase
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   ```
4. Redeploy

This will ensure:
- ✅ Persistent state across deployments
- ✅ Concurrent access handling
- ✅ Scalable storage
- ✅ Better performance
