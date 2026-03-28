# Automated Monitoring & Alerts Setup

## 1. Uptime Monitoring (FREE)

### Option A: UptimeRobot (Recommended - Free)
1. Sign up at https://uptimerobot.com (Free tier: 50 monitors, 5-min checks)
2. Add these monitors:

```
Monitor 1: Health Endpoint
- Type: HTTP(s)
- URL: https://finverno.com/api/health
- Interval: 5 minutes
- Alert when: Status Code ≠ 200 OR Response Time > 10s
- Alert contacts: Your email + SMS

Monitor 2: Homepage
- Type: HTTP(s)
- URL: https://finverno.com
- Interval: 5 minutes

Monitor 3: Contractor Dashboard
- Type: Keyword
- URL: https://finverno.com/dashboard/contractor
- Keyword: "Projects" (must be present)
- Interval: 10 minutes

Monitor 4: Investor Dashboard
- Type: Keyword
- URL: https://finverno.com/dashboard/investor
- Keyword: "Opportunities" (must be present)
- Interval: 10 minutes
```

### Option B: Better Uptime (More Features)
1. Sign up at https://betteruptime.com (Free: 10 monitors, 30s checks)
2. Better alerting and status pages
3. Integrates with Slack, Discord, PagerDuty

### Quick Setup Script
```bash
# Using Better Uptime API
curl -X POST https://betteruptime.com/api/v2/monitors \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://finverno.com/api/health",
    "monitor_type": "status",
    "check_frequency": 60,
    "request_timeout": 10,
    "email": true,
    "sms": true,
    "call": false
  }'
```

---

## 2. GitHub Actions Notifications

### Slack Integration (Recommended)

#### Setup:
1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Add to GitHub Secrets: `SLACK_WEBHOOK_URL`
3. Already configured in `.github/workflows/ci.yml`

#### Add to CI Pipeline:
```yaml
# Add to .github/workflows/ci.yml at the end
  notify:
    name: Send Notifications
    runs-on: ubuntu-latest
    needs: [quality-checks]
    if: always()
    steps:
      - name: Slack Notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Build ${{ github.event_name }} by ${{ github.actor }}
            Tests: ${{ needs.quality-checks.result }}
            Branch: ${{ github.ref }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
        if: always()
```

### Discord Integration (Alternative)
```yaml
- name: Discord Notification
  uses: sarisia/actions-status-discord@v1
  if: always()
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    title: "Finverno CI/CD"
    description: "Build ${{ job.status }}"
```

### Email Notifications (Built-in)
- GitHub already sends emails for failed workflows
- Configure at: GitHub.com → Settings → Notifications → Actions
- Enable "Send notifications for failed workflows only"

---

## 3. Sentry Alerts (Error Monitoring)

### Setup Sentry Alerts:
1. Go to Sentry.io → Settings → Alerts
2. Create these alert rules:

**Alert 1: Critical Errors**
```
Trigger: Any error with level=error
Frequency: Immediately
Actions:
  - Email: your@email.com
  - SMS (if configured)
  - Slack channel: #finverno-alerts
Filters:
  - Environment: production
  - Level: error or fatal
```

**Alert 2: High Error Rate**
```
Trigger: More than 10 errors in 5 minutes
Frequency: Every 5 minutes
Actions:
  - Email + Slack
Filters:
  - Environment: production
```

**Alert 3: Specific Feature Failures**
```
Trigger: Error with tag.feature = "boq-takeoff"
Frequency: Immediately
Actions: Email + Slack
```

### Sentry Slack Integration:
```bash
# In Sentry dashboard
1. Settings → Integrations → Slack
2. Click "Add Workspace"
3. Choose channel: #finverno-errors
4. Route all production errors there
```

---

## 4. Automated Test Reports

### Daily Test Summary (GitHub Action)

Create `.github/workflows/daily-health-check.yml`:
```yaml
name: Daily Health Check

on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check Production Health
        run: |
          response=$(curl -s https://finverno.com/api/health)
          status=$(echo $response | jq -r '.status')

          if [ "$status" != "healthy" ]; then
            echo "⚠️ PRODUCTION UNHEALTHY: $response"
            exit 1
          fi

          echo "✅ Production is healthy"
          echo "$response" | jq '.'

      - name: Run Smoke Tests
        run: |
          # Check critical pages load
          curl -f https://finverno.com || exit 1
          curl -f https://finverno.com/contractors || exit 1
          curl -f https://finverno.com/investors || exit 1

      - name: Notify Results
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "Daily Health Check: ${{ job.status }}"
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Weekly Test Coverage Report

Create `.github/workflows/weekly-report.yml`:
```yaml
name: Weekly Coverage Report

on:
  schedule:
    - cron: '0 10 * * 1'  # Monday 10 AM UTC
  workflow_dispatch:

jobs:
  coverage-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:coverage

      - name: Generate Summary
        run: |
          echo "# Weekly Test Report" > report.md
          echo "" >> report.md
          echo "## Coverage Summary" >> report.md
          echo '```' >> report.md
          cat coverage/coverage-summary.txt >> report.md
          echo '```' >> report.md

      - name: Send to Slack
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              text: "Weekly Test Coverage Report",
              attachments: [{
                color: 'good',
                text: `Test Coverage Report - Week of ${new Date().toISOString()}`
              }]
            }
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 5. Vercel Deployment Notifications

### Vercel Integration:
1. Go to Vercel Dashboard → Settings → Integrations
2. Install "Slack" integration
3. Choose notifications:
   - ✅ Deployment started
   - ✅ Deployment succeeded
   - ✅ Deployment failed
   - ✅ Deployment ready
4. Select channel: #finverno-deployments

### Or use Vercel Webhook:
```bash
# Add webhook in Vercel dashboard
URL: YOUR_SLACK_WEBHOOK
Events: deployment.created, deployment.succeeded, deployment.failed
```

---

## 6. Custom Monitoring Dashboard

### Create a Status Page

Option A: **StatusPage.io** (Free tier)
- Create public status page
- Auto-update from monitors
- Incident management
- URL: status.finverno.com

Option B: **GitHub Pages Status**
Create `.github/workflows/update-status.yml`:
```yaml
name: Update Status Page

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes

jobs:
  update-status:
    runs-on: ubuntu-latest
    steps:
      - name: Check Services
        id: check
        run: |
          # Check health
          health=$(curl -s https://finverno.com/api/health | jq -r '.status')
          echo "health=$health" >> $GITHUB_OUTPUT

          # Check response time
          time=$(curl -w "%{time_total}" -o /dev/null -s https://finverno.com)
          echo "response_time=$time" >> $GITHUB_OUTPUT

      - name: Update Status Badge
        run: |
          # Generate status badge
          status="${{ steps.check.outputs.health }}"
          color="green"
          if [ "$status" != "healthy" ]; then color="red"; fi

          # Could push to GitHub Pages or update README
          echo "Status: $status" > status.txt
```

---

## 7. Mobile Notifications

### PagerDuty (For Critical Alerts)
1. Sign up: https://www.pagerduty.com (Free trial)
2. Create service: "Finverno Production"
3. Add escalation policy:
   - Alert via Push notification
   - If not acknowledged in 5 min → SMS
   - If not acknowledged in 10 min → Call

### Connect to Sentry:
```bash
# Sentry → Settings → Integrations → PagerDuty
# Map critical errors to PagerDuty incidents
```

### Connect to Uptime Monitor:
```bash
# UptimeRobot → My Settings → Alert Contacts
# Add PagerDuty email: your-service@pagerduty.com
```

---

## Quick Start: 30-Minute Setup

### Step 1: Uptime Monitoring (5 min)
```bash
# Sign up for UptimeRobot
# Add health endpoint monitor
# Add email alert
```

### Step 2: GitHub Notifications (5 min)
```bash
# GitHub → Repo → Settings → Notifications
# Enable email for failed workflows
```

### Step 3: Sentry Alerts (10 min)
```bash
# Sentry → Alerts → New Alert Rule
# Set up critical error alerts
# Add email notification
```

### Step 4: Slack Integration (10 min)
```bash
# Create Slack webhook
# Add to GitHub Secrets
# Test with manual workflow run
```

---

## What You'll Get

### Daily
- 📧 Email if health check fails
- 📧 Email if any test fails in CI/CD
- 📱 Slack notification for deployments
- 📱 Slack notification for errors (from Sentry)

### Weekly
- 📊 Test coverage report
- 📊 Error summary from Sentry
- 📊 Uptime report from UptimeRobot

### Immediately (When Issues Occur)
- 🚨 SMS/Call if production is down (PagerDuty)
- 🚨 Slack alert if critical error
- 🚨 Email if deployment fails
- 🚨 Push notification if health check fails

---

## Cost Breakdown

### Free Tier (Recommended Start)
- UptimeRobot: FREE (50 monitors)
- GitHub Actions: FREE (2,000 min/month)
- Sentry: FREE (5k events/month)
- Slack: FREE
- **Total: $0/month**

### Paid Tier (For Growth)
- Better Uptime: $20/month (unlimited monitors)
- Sentry Team: $26/month (50k events)
- PagerDuty: $21/user/month
- **Total: ~$67/month**

---

## Next Steps

1. **Today**: Set up UptimeRobot + GitHub email notifications (15 min)
2. **This Week**: Configure Sentry alerts (30 min)
3. **Next Week**: Add Slack integration (30 min)
4. **Month 2**: Consider PagerDuty for on-call rotation

Let me know which notification channels you prefer and I can help configure them!
