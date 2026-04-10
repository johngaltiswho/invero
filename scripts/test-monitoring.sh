#!/bin/bash

# Test Monitoring Setup Script
# This script helps verify your monitoring is working correctly

echo "🔍 Testing Finverno Monitoring Setup"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Endpoint
echo "1. Testing Health Endpoint..."
response=$(curl -s -w "\n%{http_code}" https://finverno.com/api/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo -e "   ${GREEN}✓${NC} Health endpoint returning 200"
  status=$(echo "$body" | jq -r '.status' 2>/dev/null)
  if [ "$status" = "healthy" ]; then
    echo -e "   ${GREEN}✓${NC} System status is healthy"
  else
    echo -e "   ${YELLOW}⚠${NC} System status is: $status"
  fi
else
  echo -e "   ${RED}✗${NC} Health endpoint returned: $http_code"
  echo "   UptimeRobot would alert you about this!"
fi
echo ""

# Test 2: Homepage
echo "2. Testing Homepage..."
homepage_code=$(curl -s -o /dev/null -w "%{http_code}" https://finverno.com)
if [ "$homepage_code" -eq 200 ]; then
  echo -e "   ${GREEN}✓${NC} Homepage loading (200)"
else
  echo -e "   ${RED}✗${NC} Homepage returned: $homepage_code"
fi
echo ""

# Test 3: Response Times
echo "3. Checking Response Times..."
health_time=$(curl -w "%{time_total}\n" -o /dev/null -s https://finverno.com/api/health)
homepage_time=$(curl -w "%{time_total}\n" -o /dev/null -s https://finverno.com)

echo "   Health API: ${health_time}s"
echo "   Homepage: ${homepage_time}s"

if (( $(echo "$health_time > 5.0" | bc -l) )); then
  echo -e "   ${YELLOW}⚠${NC} Health API is slow (>${health_time}s)"
else
  echo -e "   ${GREEN}✓${NC} Response times normal"
fi
echo ""

# Test 4: Critical Pages
echo "4. Testing Critical Pages..."

check_page() {
  url=$1
  name=$2
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$code" -eq 200 ]; then
    echo -e "   ${GREEN}✓${NC} $name (200)"
  else
    echo -e "   ${RED}✗${NC} $name ($code)"
  fi
}

check_page "https://finverno.com/contractors" "Contractors Page"
check_page "https://finverno.com/investors" "Investors Page"
echo ""

# Test 5: UptimeRobot API (if configured)
echo "5. UptimeRobot Status..."
echo "   To check your monitors via API:"
echo "   curl -X POST https://api.uptimerobot.com/v2/getMonitors \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"api_key\":\"YOUR_API_KEY\",\"format\":\"json\"}'"
echo ""

# Summary
echo "===================================="
echo "📊 Summary"
echo "===================================="
echo ""
echo "What to do next:"
echo "1. ✅ Verify UptimeRobot shows all monitors as 'Up'"
echo "2. ✅ Check you received welcome/verification emails"
echo "3. ✅ Test an alert by pausing a monitor in UptimeRobot"
echo "4. ✅ Review your alert contacts are configured"
echo ""
echo "UptimeRobot Dashboard: https://uptimerobot.com/dashboard"
echo ""
