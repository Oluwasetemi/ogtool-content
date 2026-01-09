# Reddit Content Automation - Web Dashboard

Production-ready Reddit content marketing automation system with sophisticated quality scoring and natural language generation.

## Overview

This Next.js application provides a web interface for generating, reviewing, and managing Reddit content calendars. The system creates authentic-sounding posts and comments across multiple personas while avoiding detection patterns.

**Key Features:**
- Weekly content calendar generation with 7.0+ quality scores (target: 8.5+)
- Multi-dimensional quality scoring (5 dimensions)
- Real-time generation progress tracking
- Calendar review with detailed quality breakdowns
- CSV export for approved calendars
- Persona and subreddit management

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **AI:** Vercel AI SDK (GPT-4)
- **State:** JSON files (migration path to Supabase documented)
- **Real-time:** PartyKit (per user instructions)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenAI API key

### Installation

1. Clone the repository:
```bash
cd /Users/oluwasetemi/Development/projects/interviews/ogtools/app
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your OpenAI API key:
```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Verify data files exist:
```bash
ls data/
# Should show: company.json, personas.json, keywords.json, state.json, calendars/
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### Production Build

```bash
npm run build
npm start
```

## Dashboard Features

### Home Dashboard (`/`)

**Stats Overview:**
- Total calendars generated
- Average quality score
- Total posts and comments

**Recent Calendars:**
- Grid view of last 6 calendars
- Quick quality scores
- Status badges (draft, approved, posted)
- Click to view details

### Calendar Generation (`/calendar/generate`)

**Configuration:**
- Posts per week (1-10, default: 3)
- Minimum quality score (5.0-9.0, default: 7.0)

**Real-time Progress:**
- Step-by-step generation updates
- Quality score display
- Success/error messaging

**How it Works:**
1. Selects 3 diverse subreddits with culture matching
2. Assigns authentic personas to each post
3. Generates topics from persona pain points
4. Integrates keywords naturally
5. Creates comment threads with realistic timing
6. Scores quality across 5 dimensions
7. Retries up to 5 times to meet quality threshold

### Calendar Detail View (`/calendar/[weekId]`)

**Main Content:**
- Full post display with titles and bodies
- Threaded comments with role indicators
- Timing information (realistic gaps)
- Keyword tags and metadata

**Quality Sidebar:**
- Overall score badge with grade (S, A+, A, B, C)
- 5-dimensional breakdown:
  - **Naturalness (30%):** Language authenticity, imperfections
  - **Distribution (25%):** Persona/subreddit/keyword balance
  - **Consistency (20%):** Persona voice maintenance
  - **Diversity (15%):** Week-over-week variety
  - **Timing (10%):** Realistic temporal patterns
- Quality flags with severity indicators
- Metadata (generated date, attempt number, threshold)

**Actions:**
- Export to CSV (two tables: posts + comments)
- Approve calendar (changes status to 'approved')
- Generate another calendar
- Regenerate this week (future)

## API Documentation

### `GET /api/calendar`

List all calendars with summary data.

**Response:**
```json
{
  "calendars": [
    {
      "weekId": "week-2026-01",
      "startDate": "2026-01-06",
      "status": "draft",
      "postCount": 3,
      "commentCount": 7,
      "qualityScore": 8.6,
      "generatedAt": 1736208000000
    }
  ]
}
```

### `POST /api/calendar/generate`

Generate a new weekly calendar.

**Request Body:**
```json
{
  "minQualityScore": 7.0,
  "postsPerWeek": 3
}
```

**Response:**
```json
{
  "success": true,
  "calendar": {
    "weekId": "week-2026-02",
    "startDate": "2026-01-13",
    "posts": [...],
    "comments": [...],
    "qualityScore": {
      "overall": 8.6,
      "naturalness": 9.2,
      "distribution": 8.8,
      "consistency": 8.5,
      "diversity": 8.0,
      "timing": 8.9,
      "flags": []
    },
    "status": "draft"
  },
  "message": "Generated calendar with quality score 8.6"
}
```

### `GET /api/calendar/[weekId]`

Get specific calendar details.

**Response:**
```json
{
  "calendar": {
    "weekId": "week-2026-01",
    "startDate": "2026-01-06",
    "posts": [
      {
        "post_id": "P001",
        "subreddit": "r/startups",
        "title": "best way to track team bandwidth?",
        "body": "...",
        "author_username": "riley_ops",
        "timestamp": "2026-01-06T10:23:00Z",
        "keyword_ids": ["K1", "K4"],
        "metadata": {
          "topic": "capacity tracking",
          "intent": "recommendation_seeking",
          "targetEngagement": 5
        }
      }
    ],
    "comments": [
      {
        "comment_id": "C001",
        "post_id": "P001",
        "parent_comment_id": null,
        "username": "jordan_consults",
        "comment_text": "we use slideforge for this",
        "timestamp": "2026-01-06T10:35:00Z",
        "metadata": {
          "role": "initial_response",
          "productMention": "slideforge",
          "useCase": "bandwidth tracking"
        }
      }
    ],
    "qualityScore": {...},
    "status": "draft"
  }
}
```

### `PATCH /api/calendar/[weekId]`

Update calendar status.

**Request Body:**
```json
{
  "status": "approved"
}
```

### `GET /api/calendar/[weekId]/export`

Export calendar to CSV format.

**Response:** CSV file download with two tables:
1. Posts table with all post fields
2. Comments table with all comment fields

## Configuration

### Company Info (`data/company.json`)

```json
{
  "name": "SlideForge",
  "shortDescription": "AI-powered slide generator",
  "longDescription": "...",
  "icpSegments": [...],
  "subreddits": [...],
  "postsPerWeek": 3
}
```

### Personas (`data/personas.json`)

5 personas with detailed backstories (500+ words each):
- `riley_ops` - Operations leader
- `jordan_consults` - Management consultant
- `emily_econ` - Economic research analyst
- `alex_sells` - Sales professional
- `priya_pm` - Product manager

Each persona includes:
- Voice profile (casualness, typo rate, emotional tone)
- Authenticity scores per subreddit
- Background story and pain points

### Keywords (`data/keywords.json`)

16 keywords (K1-K16) with semantic mappings for natural integration.

### State Management (`data/state.json`)

Tracks:
- Generation history (last 12 weeks)
- Persona quotas and usage timestamps
- Subreddit rotation and topic history
- Keyword usage contexts
- Pattern detection (pairings, timing)

**State is automatically updated after each generation.**

## Quality Scoring System

### Scoring Algorithm

Overall score = weighted average of 5 dimensions:

```
Overall = (Naturalness × 0.30) +
          (Distribution × 0.25) +
          (Consistency × 0.20) +
          (Diversity × 0.15) +
          (Timing × 0.10)
```

**Thresholds:**
- S Grade: 9.0+
- A+ Grade: 8.5-8.9
- A Grade: 8.0-8.4
- B Grade: 7.0-7.9
- C Grade: 6.0-6.9
- D Grade: 5.0-5.9

**Target:** 7.0+ minimum, 8.5+ for excellent quality

### Quality Flags

**Critical (Red):**
- Repeated subreddits in same week
- Same persona used 3+ times in one week
- Keyword forced (appears in title + 3+ comments)
- Suspicious timing (all comments within 5 minutes)

**Warning (Yellow):**
- Low naturalness (< 7.0)
- Imbalanced distribution (max/min ratio > 3x)
- Voice inconsistency (< 7.5)
- Topic similarity to recent weeks (> 0.75)

**Info (Blue):**
- High quality achievement (> 9.0)
- Diverse engagement patterns

## Development Workflow

### Testing

Run unit tests:
```bash
npm test
```

Run integration tests:
```bash
npm run test:integration
```

Test generation from CLI:
```bash
npm run generate
```

### Code Structure

```
app/
├── api/              # API routes
│   └── calendar/     # Calendar endpoints
├── calendar/         # Calendar pages
│   ├── generate/     # Generation page
│   └── [weekId]/     # Detail view
└── page.tsx          # Dashboard home

components/
└── calendar/         # Calendar components
    ├── calendar-card.tsx
    ├── post-view.tsx
    ├── comment-thread.tsx
    └── quality-badge.tsx

lib/
├── core/             # Core algorithm
│   ├── calendar-generator.ts
│   ├── types.ts
│   └── constants.ts
├── engines/          # Generation engines
│   ├── post-engine.ts
│   ├── comment-engine.ts
│   └── timing.ts
├── scoring/          # Quality scoring
│   ├── quality-scorer.ts
│   ├── naturalness.ts
│   ├── distribution.ts
│   ├── consistency.ts
│   ├── diversity.ts
│   └── timing.ts
├── state/            # State management
│   ├── state-manager.ts
│   └── json-store.ts
├── ai/               # AI integration
│   ├── text-generator.ts
│   ├── prompts.ts
│   └── persona-voice.ts
└── utils/            # Utilities
    ├── random.ts
    ├── similarity.ts
    └── validation.ts
```

### Adding a New Persona

1. Edit `data/personas.json`:
```json
{
  "username": "new_persona",
  "name": "New Persona",
  "role": "Role Title",
  "background": "500+ word backstory...",
  "painPoints": ["frustration 1", "frustration 2"],
  "voiceProfile": {
    "casualness": 0.5,
    "typoRate": 0.03,
    "emotionalTone": "neutral",
    "sentenceLengthAvg": 12,
    "authenticity": {
      "r/subreddit1": 0.9,
      "r/subreddit2": 0.7
    }
  }
}
```

2. Restart the development server
3. New persona will be included in future generations

### Adding a New Subreddit

1. Edit `data/company.json` - add to `subreddits` array
2. Edit `lib/core/constants.ts` - add to `SUBREDDIT_CULTURE_MAP`:

```typescript
'r/newsubreddit': {
  segments: ['target_audience_1', 'target_audience_2'],
  tone: 'professional', // or 'casual', 'technical', 'hustle'
  activityLevel: 0.8, // 0.0-1.0
  postingRules: ['no self-promotion', 'questions welcome'],
}
```

3. Update persona authenticity scores in `data/personas.json`
4. Restart the server

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables:
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy

### Other Platforms

1. Build the app:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

3. Ensure data files are accessible:
   - Mount `/data` directory with persistence
   - Or migrate to Supabase (see IMPLEMENTATION.md)

### Environment Variables

**Required:**
- `OPENAI_API_KEY` - OpenAI API key for GPT-4

**Optional:**
- `NEXT_PUBLIC_APP_URL` - Base URL for API calls (default: http://localhost:3000)
- `STORAGE_ADAPTER` - Storage backend: `json` or `supabase` (default: json)

## Troubleshooting

### Generation Fails with Low Quality Score

**Problem:** Calendar generation completes but score is below threshold (< 7.0)

**Solutions:**
- Check persona backstories - ensure they have clear pain points
- Review recent calendars - may be topic exhaustion
- Increase `minQualityScore` parameter to force higher quality
- Check quality flags for specific issues

### API Returns 500 Error

**Problem:** Generation endpoint fails

**Solutions:**
1. Check OpenAI API key is valid
2. Verify data files exist and are valid JSON
3. Check server logs for specific error
4. Ensure `data/state.json` is writable

### Posts Look Too Perfect

**Problem:** Naturalness score is low (< 7.0)

**Solutions:**
- Increase typo rate in persona voice profiles
- Check prompts in `lib/ai/text-generator.ts`
- Verify naturalness transformations are applied
- Review persona casualness levels

### Same Personas Keep Getting Selected

**Problem:** Distribution score is low

**Solutions:**
- Check `data/state.json` - persona quotas may need manual reset
- Verify rest bonus calculation in `lib/engines/post-engine.ts`
- Increase `maxAsOPIn30Days` threshold in constants

### Comments Have Unrealistic Timing

**Problem:** Timing score is low (< 7.0)

**Solutions:**
- Check `lib/engines/timing.ts` - verify gap ranges
- Review thread orchestration in `comment-engine.ts`
- Ensure variance is applied to base gaps

### CSV Export Missing Data

**Problem:** Exported CSV has empty fields

**Solutions:**
- Verify calendar structure in `data/calendars/[weekId].json`
- Check export route at `app/api/calendar/[weekId]/export/route.ts`
- Ensure all required fields exist in calendar data

## Migration to Supabase

When ready to migrate from JSON to Supabase:

1. Create Supabase project and get connection string
2. Run migration script:

```bash
npm run migrate:supabase
```

3. Update environment variables:
```env
STORAGE_ADAPTER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

4. Restart the application

See `IMPLEMENTATION.md` for detailed migration guide.

## Performance Optimization

**Current Performance:**
- Generation time: ~30-60 seconds per calendar
- API response time: < 200ms for calendar fetch
- Dashboard load time: < 1 second

**Optimization Tips:**
1. Cache persona voice profiles (already implemented)
2. Batch AI SDK calls when generating multiple posts
3. Use React Server Components for static content
4. Enable Next.js image optimization
5. Add CDN for static assets

## Support

For detailed algorithm documentation, see `/lib/core`, `/lib/engines`, `/lib/scoring`, `/lib/state`.



## License

Proprietary - Client: Maddie (SlideForge)
