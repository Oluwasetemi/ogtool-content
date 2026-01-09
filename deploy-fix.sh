#!/bin/bash

# Production Fix Deployment Script
# Commits and pushes the state initialization fixes

set -e  # Exit on error

echo "=================================================="
echo "  Reddit Content Automation - Production Fix"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the UI directory."
    exit 1
fi

echo "📋 Files to commit:"
echo "  - lib/core/calendar-generator.ts (State initialization fix)"
echo "  - lib/state/json-store.ts (Default state on file not found)"
echo "  - lib/ai/text-generator.ts (Enhanced error logging)"
echo "  - app/api/calendar/generate/route.ts (Environment validation)"
echo "  - app/api/test/openai/route.ts (Diagnostic endpoint)"
echo "  - vercel.json (300s timeout configuration)"
echo "  - TROUBLESHOOTING.md (Troubleshooting guide)"
echo "  - PRODUCTION_FIX.md (Fix documentation)"
echo "  - deploy-fix.sh (This script)"
echo ""

# Check git status
echo "🔍 Checking git status..."
git status --short

echo ""
read -p "Continue with commit? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "📦 Staging files..."

# Add all modified files
git add lib/core/calendar-generator.ts
git add lib/state/json-store.ts
git add lib/ai/text-generator.ts
git add app/api/calendar/generate/route.ts
git add app/api/test/openai/route.ts
git add vercel.json
git add TROUBLESHOOTING.md
git add PRODUCTION_FIX.md
git add deploy-fix.sh

echo "✅ Files staged"
echo ""

# Commit
echo "📝 Committing changes..."
git commit -m "Fix: Initialize complete state structure and add Vercel timeout config

- Fixed TypeError: Cannot read properties of undefined (reading 'subredditRotation')
- Initialize all 4 state properties (history, quotas, patterns, qualityMetrics)
- Return default state when state.json not found
- Increase Vercel function timeout to 300s for AI generation
- Add environment validation and diagnostic endpoint
- Enhanced error logging for better debugging"

echo "✅ Committed"
echo ""

# Push
echo "🚀 Pushing to origin..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$CURRENT_BRANCH"

echo ""
echo "=================================================="
echo "  ✅ Deployment Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Wait for Vercel to deploy (check dashboard)"
echo ""
echo "2. Test OpenAI connection:"
echo "   curl https://ogtool-content.vercel.app/api/test/openai"
echo ""
echo "3. Test calendar generation:"
echo "   curl -X POST https://ogtool-content.vercel.app/api/calendar/generate \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"minQualityScore\": 7.0, \"postsPerWeek\": 3}'"
echo ""
echo "4. Monitor logs:"
echo "   vercel logs https://ogtool-content.vercel.app --follow"
echo ""
echo "See PRODUCTION_FIX.md for detailed instructions."
echo ""
