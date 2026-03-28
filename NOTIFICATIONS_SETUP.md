# 🔔 Automated Notifications Setup

Get proactive alerts when things break or need attention. This guide walks through setting up automated monitoring and notifications in **under 30 minutes**.

---

## Quick Start (15 Minutes)

### 1. GitHub Email Notifications (5 min) ✅ EASIEST

**Already enabled by default!** You'll receive emails when:
- CI/CD builds fail
- Tests fail
- Someone comments on your PR

**To verify:**
```
1. Go to: https://github.com/settings/notifications
2. Check: ✅ "Actions" - "Send notifications for failed workflows"
3. Set email preferences to "All activity"
```

**What you get:**
- 📧 Email when builds fail
- 📧 Email when tests fail
- 📧 Email when deployments fail

---

### 2. Uptime Monitoring (10 min) ⭐ HIGHLY RECOMMENDED

**UptimeRobot Setup (Free - 50 monitors):**

```bash
# Step 1: Sign up
1. Go to: https://uptimerobot.com
2. Sign up (free account)

# Step 2: Add health monitor
1. Click "Add New Monitor"
2. Monitor Type: HTTP(s)
3. Friendly Name: "Finverno Health Check"
4. URL: https://finverno.com/api/health
5. Monitoring Interval: 5 minutes
6. Monitor Timeout: 30 seconds
7. Click "Create Monitor"

# Step 3: Add alert contacts
1. Click "Add Alert Contact"
2. Type: Email
3. Enter your email
4. Verify email

# Step 4: Add more monitors (optional)
- Homepage: https://finverno.com
- Contractor Dashboard: https://finverno.com/dashboard/contractor
- Investor Dashboard: https://finverno.com/dashboard/investor
```

**What you get:**
- 📧 Email when site goes down
- 📧 Email when health check fails
- 📧 Email when response time is slow
- 📱 SMS alerts (upgrade to paid)
- 📊 Uptime statistics dashboard

**Alternative: Better Uptime (Better UI, more features)**
- Free tier: 10 monitors, 30-second checks
- Signup: https://betteruptime.com
- Better alerting and status pages

---

## Intermediate Setup (30 Minutes)

### 3. Slack Integration (15 min) ⭐ RECOMMENDED

**Create Slack Webhook:**

```bash
# Step 1: Create Slack App
1. Go to: https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Finverno Notifications"
4. Workspace: Your workspace

# Step 2: Enable Incoming Webhooks
1. Click "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" to ON
3. Click "Add New Webhook to Workspace"
4. Choose channel (create #finverno-alerts first)
5. Copy the webhook URL (starts with https://hooks.slack.com/...)

# Step 3: Add to GitHub Secrets
1. Go to: https://github.com/YOUR_USERNAME/invero/settings/secrets/actions
2. Click "New repository secret"
3. Name: SLACK_WEBHOOK_URL
4. Value: [paste your webhook URL]
5. Click "Add secret"

# Step 4: Enable Slack notifications in workflows
# Edit .github/workflows/ci.yml and uncomment the Slack notification sections
```

**What you get:**
- 📱 Slack message when builds fail
- 📱 Slack message for daily health checks
- 📱 Slack message for weekly reports
- 📱 Real-time deployment notifications

**Test it:**
```bash
# Trigger a workflow manually to test
1. Go to: https://github.com/YOUR_USERNAME/invero/actions
2. Select "Daily Health Check"
3. Click "Run workflow"
4. Check #finverno-alerts channel
```

---

### 4. Sentry Error Alerts (15 min) ⭐ CRITICAL

**Configure Sentry Alerts:**

```bash
# Step 1: Go to Sentry
1. Visit: https://sentry.io
2. Select your "finverno" project

# Step 2: Create Alert Rule
1. Go to: Alerts → Create Alert
2. Choose "Issues"
3. Set conditions:
   - When: "An event is seen"
   - If: "The issue's level is equal to error"
   - Then: "Send a notification via Email"
4. Add your email
5. Name: "Production Errors"
6. Environment: production
7. Save

# Step 3: Create High-Error-Rate Alert
1. Create another alert
2. Conditions: "Number of events in an issue is more than 10 in 5 minutes"
3. Name: "High Error Rate"
4. Save

# Step 4: (Optional) Add Slack to Sentry
1. Sentry → Settings → Integrations
2. Find "Slack" → Install
3. Authorize workspace
4. Choose channel: #finverno-errors
5. Route alerts there
```

**What you get:**
- 📧 Email when errors occur in production
- 📧 Email when error rate spikes
- 📱 Slack alerts for critical errors (if configured)
- 🔍 Full error context and stack traces
- 📊 Error trends and analytics

---

## Advanced Setup (Optional)

### 5. Vercel Deployment Notifications

**If using Vercel:**

```bash
# Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Select "finverno" project
3. Go to: Settings → Notifications

# Step 2: Add Slack Integration
1. Click "Add" next to Slack
2. Authorize workspace
3. Choose channel: #finverno-deployments
4. Select events:
   ✅ Deployment Started
   ✅ Deployment Ready
   ✅ Deployment Failed
5. Save

# Alternative: Webhook
1. Add your Slack webhook URL
2. Select same events
```

**What you get:**
- 📱 Slack notification when deployments start
- 📱 Slack notification when deployments complete
- 📱 Slack notification when deployments fail
- 🔗 Direct link to deployment logs

---

### 6. Mobile Push Notifications (PagerDuty)

**For on-call rotation (when team grows):**

```bash
# Step 1: Sign up for PagerDuty
1. Visit: https://www.pagerduty.com/sign-up-free/
2. Free trial for 14 days, then $21/user/month

# Step 2: Create Service
1. Services → New Service
2. Name: "Finverno Production"
3. Escalation Policy:
   - Level 1: Send push notification (immediate)
   - Level 2: Send SMS (after 5 min)
   - Level 3: Call phone (after 10 min)
4. Integration: Choose "Email"
5. Copy the service email (e.g., finverno@yourcompany.pagerduty.com)

# Step 3: Connect to UptimeRobot
1. UptimeRobot → Alert Contacts
2. Add Alert Contact → Email
3. Enter PagerDuty service email
4. Assign to monitors

# Step 4: Connect to Sentry
1. Sentry → Integrations → PagerDuty
2. Install and connect
3. Map critical errors to PagerDuty incidents
```

**What you get:**
- 📱 Push notifications on your phone
- 📱 SMS for critical alerts
- 📞 Phone call if not acknowledged
- 📊 Incident management dashboard
- 👥 On-call schedule management

---

## What Automated Workflows Are Running

### Daily (Every Morning)
✅ **Daily Health Check** - Runs at 9 AM UTC
- Checks `/api/health` endpoint
- Checks critical pages load
- Measures response times
- **Alerts you if**: Production is unhealthy
- **Workflow**: `.github/workflows/daily-health-check.yml`

### Weekly (Every Monday)
✅ **Weekly Test Report** - Runs Monday 10 AM UTC
- Runs full test suite
- Generates coverage report
- Shows repository stats
- **Sends**: Summary via GitHub Actions (and Slack if configured)
- **Workflow**: `.github/workflows/weekly-report.yml`

### On Every Push/PR
✅ **CI/CD Pipeline** - Runs on every push
- Linting
- Type checking
- Unit tests
- Integration tests
- E2E tests
- Security scan
- **Alerts you if**: Any check fails
- **Workflow**: `.github/workflows/ci.yml`

### Continuous (Every 5 min)
✅ **Uptime Monitoring** - If you set up UptimeRobot
- Checks if site is up
- Checks health endpoint
- **Alerts you if**: Site goes down or health fails

---

## Testing Your Setup

### 1. Test GitHub Notifications
```bash
# Cause a test failure
1. Edit a test file to make it fail
2. Push to GitHub
3. Wait for CI to run
4. Should receive email notification
```

### 2. Test Uptime Monitoring
```bash
# In UptimeRobot dashboard
1. Go to your monitor
2. Click "Actions" → "Pause Monitor"
3. It will trigger an alert
4. You should receive email
5. Resume the monitor
```

### 3. Test Slack Integration
```bash
# Trigger daily health check manually
1. Go to: https://github.com/YOUR_USERNAME/invero/actions
2. Select "Daily Health Check"
3. Click "Run workflow" → "Run workflow"
4. Wait for it to complete
5. Check Slack channel #finverno-alerts
```

### 4. Test Sentry Alerts
```bash
# Trigger a test error
1. Add this to any API route temporarily:
   throw new Error('Test alert - please ignore');
2. Deploy and trigger the error
3. Check your email for Sentry alert
4. Remove the test error
```

---

## Summary: What You Get

### Free Setup (Total: $0/month)
- ✅ Email notifications for failed builds (GitHub)
- ✅ Email alerts when site goes down (UptimeRobot)
- ✅ Email alerts for production errors (Sentry Free)
- ✅ Daily health check reports (GitHub Actions)
- ✅ Weekly test coverage reports (GitHub Actions)

### With Slack ($0/month)
- ✅ All above +
- ✅ Real-time Slack notifications
- ✅ Team visibility into issues
- ✅ Faster incident response

### With Paid Tools (~$67/month)
- ✅ All above +
- ✅ SMS/Call alerts (PagerDuty)
- ✅ Better uptime monitoring (Better Uptime)
- ✅ More Sentry events (Sentry Team)
- ✅ On-call rotation management

---

## Recommended Setup Path

**Week 1** (Today):
1. ✅ Verify GitHub email notifications (5 min)
2. ✅ Set up UptimeRobot (10 min)

**Week 2**:
3. ✅ Add Slack integration (15 min)
4. ✅ Configure Sentry alerts (15 min)

**Week 3**:
5. ✅ Add Vercel notifications (10 min)
6. ✅ Test all notification channels

**Month 2** (If needed):
7. ✅ Consider PagerDuty for on-call

---

## Quick Reference

### When You'll Get Notified

| Event | Email | Slack | SMS/Call |
|-------|-------|-------|----------|
| Build fails | ✅ | ✅* | ❌ |
| Tests fail | ✅ | ✅* | ❌ |
| Site goes down | ✅ | ❌ | ✅** |
| Production error | ✅ | ✅* | ❌ |
| Deployment fails | ✅ | ✅* | ❌ |
| Critical outage | ✅ | ✅* | ✅** |
| Daily health check | ❌ | ✅* | ❌ |
| Weekly report | ❌ | ✅* | ❌ |

\* If Slack webhook configured
\*\* If PagerDuty configured

---

## Troubleshooting

### Not receiving emails?
- Check GitHub notification settings
- Check spam folder
- Verify email in UptimeRobot/Sentry

### Slack not working?
- Verify webhook URL in GitHub Secrets
- Check webhook hasn't expired
- Uncomment Slack steps in workflow files

### Too many notifications?
- Adjust UptimeRobot check frequency (5 min → 10 min)
- Adjust Sentry alert conditions (increase threshold)
- Use Slack channels with muted notifications

---

## Next Steps

1. **Start with the Quick Start** (15 min) - Get basic notifications today
2. **Add Slack** (week 2) - Better team visibility
3. **Review weekly** - Adjust alert thresholds based on noise level
4. **Scale up** - Add more monitoring as needed

Questions? Check the detailed guide in `monitoring-setup.md` or the documentation links in each section.

---

**Last Updated**: 2026-03-28
