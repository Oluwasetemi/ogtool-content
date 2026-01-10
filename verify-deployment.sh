#!/bin/bash

# Verify Vercel Deployment Script
# Checks if the deployed code matches local code

set -e

echo "=================================================="
echo "  Vercel Deployment Verification"
echo "=================================================="
echo ""

DOMAIN="https://ogtool-content.vercel.app"

echo "🔍 Checking deployment status..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not installed. Install with: npm i -g vercel"
    echo ""
fi

# Test the OpenAI endpoint
echo "1. Testing OpenAI connection..."
OPENAI_RESPONSE=$(curl -s "$DOMAIN/api/test/openai" || echo '{"success":false}')
OPENAI_SUCCESS=$(echo "$OPENAI_RESPONSE" | grep -o '"success":[^,}]*' | cut -d':' -f2)

if [ "$OPENAI_SUCCESS" = "true" ]; then
    echo "   ✅ OpenAI connection working"
else
    echo "   ❌ OpenAI connection failed"
    echo "   Response: $OPENAI_RESPONSE"
fi
echo ""

# Test calendar generation endpoint existence
echo "2. Testing calendar generation endpoint..."
GEN_RESPONSE=$(curl -s -X POST "$DOMAIN/api/calendar/generate" \
    -H "Content-Type: application/json" \
    -d '{"minQualityScore": 7.0, "postsPerWeek": 3}' \
    --max-time 10 || echo '{"error":"timeout"}')

# Check if the response contains new logging format
if echo "$GEN_RESPONSE" | grep -q "hasHistory"; then
    echo "   ✅ Running LATEST code (commit 41c2ecb+)"
    echo "   The deployment has the state initialization fix!"
elif echo "$GEN_RESPONSE" | grep -q "hasQuotas"; then
    echo "   ❌ Running OLD code (commit c5ff132 or earlier)"
    echo "   The deployment needs to be updated!"
elif echo "$GEN_RESPONSE" | grep -q "timeout"; then
    echo "   ⏱️  Request timed out (expected for first generation)"
    echo "   Check Vercel logs to see which logging format is used"
else
    echo "   ❓ Unable to determine code version"
    echo "   Response: $(echo "$GEN_RESPONSE" | head -c 200)"
fi
echo ""

# Instructions
echo "=================================================="
echo "  Next Steps"
echo "=================================================="
echo ""
echo "If deployment is NOT on latest code:"
echo "  1. Check Vercel dashboard: https://vercel.com/dashboard"
echo "  2. Look for failed or queued deployments"
echo "  3. Manually redeploy if needed"
echo ""
echo "If deployment IS on latest code but still failing:"
echo "  1. Check full logs: vercel logs $DOMAIN --follow"
echo "  2. Look for 'State loaded: { hasHistory: true, hasQuotas: true, hasPatterns: true, hasQualityMetrics: true }'"
echo "  3. Verify all state properties are initialized"
echo ""
echo "To monitor real-time logs:"
echo "  vercel logs $DOMAIN --follow"
echo ""
