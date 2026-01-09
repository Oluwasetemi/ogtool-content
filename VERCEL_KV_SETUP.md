# Vercel KV Setup Guide

## 🚀 Quick Setup (5 minutes)

### 1. Create Vercel KV Database

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** tab
3. Click **Create Database**
4. Select **KV** (Redis)
5. Choose a name (e.g., `ogtools-production`)
6. Select your preferred region
7. Click **Create**

### 2. Connect to Your Project

1. After creating the database, click **Connect to Project**
2. Select your OGTools project
3. Select environment: **Production**, **Preview**, and **Development**
4. Click **Connect**

This automatically adds the following environment variables to your project:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

### 3. Local Development Setup

For local development, pull the environment variables:

```bash
vercel env pull .env.local
```

This creates a `.env.local` file with your KV credentials.

### 4. Seed Initial Data

Run the seed script to populate your KV database:

```bash
bun run seed-kv
```

Or manually via an API route (after deployment):

```bash
curl -X POST https://your-app.vercel.app/api/seed
```

## 📊 What Gets Stored in KV

- **Calendars**: All generated weekly calendars
- **State**: Application state (quotas, patterns, metrics)
- **Company Info**: Company configuration
- **Personas**: User personas for content generation
- **Keywords**: Keyword targeting data

## 🔑 KV Keys Structure

```
ogtools:state                    # Application state
ogtools:calendars:list           # Set of all calendar IDs
ogtools:calendar:{weekId}        # Individual calendar data
ogtools:company                  # Company information
ogtools:personas                 # Array of personas
ogtools:keywords                 # Array of keywords
```

## 🧪 Verify Setup

After setup, your app will automatically detect and use KV storage. Check the console logs:

```
✅ Using Vercel KV storage - data persists across deployments
```

If KV is not available, you'll see:
```
⚠️  Using in-memory storage (MemoryStorageAdapter) - data will not persist
💡 Set up Vercel KV for production persistence: https://vercel.com/docs/storage/vercel-kv
```

## 💰 Pricing

**Free Tier Includes:**
- 256 MB storage
- 10,000 commands per day
- Perfect for development and small production apps

**Pro Tier:**
- More storage and commands
- See [Vercel KV Pricing](https://vercel.com/docs/storage/vercel-kv/usage-and-pricing)

## 🔧 Manual Environment Variable Setup

If not using Vercel's automatic connection, add these to your `.env.local`:

```bash
KV_REST_API_URL="https://your-kv-url.upstash.io"
KV_REST_API_TOKEN="your-token-here"
```

Get these from your Vercel KV dashboard under **Settings** → **Environment Variables**.

## 🗂️ View Your Data

Use the Vercel KV dashboard to view and manage your data:

1. Go to **Storage** in Vercel Dashboard
2. Click on your KV database
3. Use the **Data Browser** to view keys and values

Or use Redis CLI:

```bash
redis-cli -u $(grep KV_URL .env.local | cut -d '=' -f2)
```

## 📝 Common Commands

```bash
# View all calendars
redis-cli -u $KV_URL SMEMBERS ogtools:calendars:list

# View a specific calendar
redis-cli -u $KV_URL GET ogtools:calendar:week-2026-02

# View application state
redis-cli -u $KV_URL GET ogtools:state

# Delete all data (careful!)
redis-cli -u $KV_URL FLUSHDB
```

## 🔄 Migration from JSON Storage

If you have existing data in JSON files, create a migration script:

```typescript
// scripts/migrate-to-kv.ts
import { kvStorage } from '@/lib/state/kv-store';
import { jsonStorage } from '@/lib/state/json-store';

async function migrate() {
  // Load from JSON
  const calendars = await jsonStorage.listCalendars();
  
  // Seed to KV
  for (const weekId of calendars) {
    const calendar = await jsonStorage.loadCalendar(weekId);
    await kvStorage.saveCalendar(calendar);
    console.log(`Migrated ${weekId}`);
  }
  
  console.log('Migration complete!');
}

migrate();
```

## 🆘 Troubleshooting

### Error: KV credentials not found
**Solution**: Run `vercel env pull .env.local` to get your credentials

### Error: Connection timeout
**Solution**: Check your KV region matches your deployment region

### Data not persisting
**Solution**: Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set in production

## 📚 Learn More

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [@vercel/kv SDK](https://github.com/vercel/storage/tree/main/packages/kv)
