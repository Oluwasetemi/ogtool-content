# Deploy to Vercel Guide

## 🚀 Quick Deployment (10 minutes)

### Step 1: Push Your Code to GitHub

```bash
# If not already pushed
git push origin main
```

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

**Option B: Using Vercel Dashboard**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Click "Deploy"

### Step 3: Set Up Vercel KV Database

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **KV** (Redis)
6. Name it `ogtools-production`
7. Click **Create**
8. Click **Connect to Project**
9. Select your project and environments (Production, Preview, Development)
10. Click **Connect**

✅ This automatically adds these environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

### Step 4: Add OpenAI API Key

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add:
   - Name: `OPENAI_API_KEY`
   - Value: `your-openai-api-key`
   - Environments: Production, Preview, Development

### Step 5: Seed Initial Data

After deployment completes:

**Option A: Via Browser**
```
https://your-app.vercel.app/setup
```
Click "Seed Data Now"

**Option B: Via API**
```bash
curl -X POST https://your-app.vercel.app/api/seed
```

### Step 6: Verify Everything Works

1. Visit your app: `https://your-app.vercel.app`
2. Check status: `https://your-app.vercel.app/api/seed`
3. Generate a calendar: `https://your-app.vercel.app/calendar/generate`

## ✅ You're Done!

Your app is now live with persistent storage! 🎉

## 📊 What Happens in Production

**Storage Priority:**
1. ✅ **Vercel KV** (if environment variables are set) - Data persists
2. 📁 **Filesystem** (if writable) - Development only
3. ⚠️  **Memory** (fallback) - Data lost on restart

**With Vercel KV configured, you get:**
- ✅ Persistent data across deployments
- ✅ Fast Redis-backed storage
- ✅ Free tier: 256MB storage + 10k commands/day
- ✅ Automatic backups
- ✅ Global distribution

## 🔧 Environment Variables Needed

```bash
# Required for AI generation
OPENAI_API_KEY=sk-...

# Automatically added by Vercel KV
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
KV_URL=redis://...

# Optional
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 🔄 Local Development with Vercel KV

Pull environment variables from Vercel:

```bash
vercel env pull .env.local
```

This downloads all your production environment variables including KV credentials.

## 📝 Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## 🆘 Troubleshooting

### Build Fails
**Check:** Ensure all dependencies are in `package.json`
```bash
bun install
git add package.json bun.lock
git commit -m "update dependencies"
git push
```

### Calendar Generation Fails
**Check:** Visit `/setup` and seed your data
**Check:** Verify `OPENAI_API_KEY` is set in environment variables

### Data Not Persisting
**Check:** Verify KV environment variables are set:
```bash
vercel env ls
```
Should show `KV_REST_API_URL` and `KV_REST_API_TOKEN`

### Storage Error
**Check console logs in Vercel:**
- Go to your project → **Deployments**
- Click on latest deployment
- Click **Functions** tab
- View logs for errors

## 💡 Pro Tips

1. **Use Preview Deployments**: Every git branch gets its own preview URL
2. **Environment-Specific Configs**: Use different KV databases for staging vs production
3. **Monitor Usage**: Check KV dashboard for usage stats
4. **Enable Analytics**: Vercel Analytics gives you insights
5. **Speed Insights**: Enable to monitor performance

## 🔗 Useful Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv)
- [Deployment Logs](https://vercel.com/dashboard)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## 🎯 Next Steps

After deployment:
1. ✅ Seed your data at `/setup`
2. ✅ Generate your first calendar
3. ✅ Set up custom domain (optional)
4. ✅ Configure analytics (optional)
5. ✅ Set up team access (optional)

---

**Questions?** Check the logs in Vercel dashboard or visit the setup page!
