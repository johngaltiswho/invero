#!/bin/bash
# Health check script for Invero platform
# Usage: ./scripts/health-check.sh <URL>

set -e

URL="${1:-http://localhost:3000}"

echo "🏥 Running health checks on: $URL"
echo "================================"
echo ""

# Check 1: Main site is accessible
echo "1️⃣  Checking main site..."
SITE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")

if [ "$SITE_STATUS" -eq "200" ]; then
  echo "   ✅ Main site is UP (Status: $SITE_STATUS)"
else
  echo "   ❌ Main site is DOWN (Status: $SITE_STATUS)"
  exit 1
fi

# Check 2: API endpoints
echo ""
echo "2️⃣  Checking API endpoints..."

# Check a public API endpoint (adjust as needed)
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/materials" || echo "000")

if [ "$API_STATUS" -eq "200" ] || [ "$API_STATUS" -eq "401" ] || [ "$API_STATUS" -eq "403" ]; then
  echo "   ✅ API is responsive (Status: $API_STATUS)"
else
  echo "   ⚠️  API returned status: $API_STATUS"
fi

# Check 3: Check for JavaScript errors (optional)
echo ""
echo "3️⃣  Checking for console errors..."
echo "   ℹ️  Manual check recommended: Open $URL in browser and check console"

# Summary
echo ""
echo "================================"
echo "✅ Health check completed successfully!"
echo ""
echo "Next steps:"
echo "  - Check Sentry for any errors: https://sentry.io"
echo "  - Verify database connections"
echo "  - Test critical user flows"
