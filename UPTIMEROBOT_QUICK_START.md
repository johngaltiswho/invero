# UptimeRobot Quick Start Guide

## 🚀 Setup (10 Minutes)

### 1. Sign Up
👉 https://uptimerobot.com → "Free Sign Up"

### 2. Add Monitors

| Monitor | Type | URL | Interval | Alert When |
|---------|------|-----|----------|------------|
| **Health Check** ⭐ | HTTP(s) | `https://finverno.com/api/health` | 5 min | Status ≠ 200 |
| **Homepage** | HTTP(s) | `https://finverno.com` | 5 min | Status ≠ 200 |
| **Contractor Dashboard** | Keyword | `https://finverno.com/dashboard/contractor` | 10 min | Missing "Projects" |
| **Investor Dashboard** | Keyword | `https://finverno.com/dashboard/investor` | 10 min | Missing "Opportunities" |

### 3. Add Your Email
Settings → Alert Contacts → Add Email → Verify

### 4. Configure Alerts
- ✅ Send when DOWN
- ✅ Send when UP
- ✅ Send when STARTED
- Max notifications: 10/hour

---

## 📧 What Emails You'll Receive

### When Site Goes Down:
```
Subject: [DOWN] Finverno Health Check
Time: Immediate (within 5 minutes)
Content: HTTP error code, reason, timestamp
```

### When Site Comes Back Up:
```
Subject: [UP] Finverno Health Check
Content: Downtime duration, recovery timestamp
```

### Weekly/Monthly:
```
Subject: UptimeRobot Weekly Report
Content: Uptime %, downtime incidents, response times
```

---

## 🧪 Test Your Setup

### Option 1: Use Test Script
```bash
cd /Users/uma/Documents/finverno
./scripts/test-monitoring.sh
```

### Option 2: Manual Test in UptimeRobot
```
1. Go to: https://uptimerobot.com/dashboard
2. Find your "Finverno Health Check" monitor
3. Click the monitor name
4. Click "Pause Monitoring"
5. Wait 1 minute
6. You should receive "Monitor Paused" email
7. Click "Resume Monitoring"
```

### Option 3: Check Current Status
```bash
# Check what UptimeRobot sees
curl -s https://finverno.com/api/health | jq '.'
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-28T...",
  "checks": [
    {"name": "database", "status": "healthy"},
    {"name": "storage", "status": "healthy"},
    ...
  ]
}
```

---

## 📊 UptimeRobot Dashboard Overview

### Key Metrics to Watch:
- **Uptime %**: Target 99.9%+
- **Average Response Time**: Target <2s
- **Incidents This Month**: Target <1
- **Current Status**: All monitors should be green

### Where to Find Them:
1. Login: https://uptimerobot.com/dashboard
2. See all monitors at a glance
3. Click any monitor for detailed stats
4. View response time graphs
5. Download reports for stakeholders

---

## ⚙️ Advanced Settings (Optional)

### Add SMS Alerts (Paid - $6/month)
```
1. Settings → Alert Contacts → Add SMS
2. Enter phone number
3. Verify via code
4. Assign to critical monitors only
```

### Monitor-Specific Alert Contacts
```
1. Click monitor → Edit
2. Scroll to "Alert Contacts to Notify"
3. Select which contacts get alerts for THIS monitor
4. Example: SMS only for health check, email for others
```

### Custom HTTP Headers (For Authenticated Endpoints)
```
1. Edit monitor → Advanced Options
2. Add custom HTTP headers:
   - Authorization: Bearer YOUR_TOKEN
   - X-Custom-Header: value
```

### Maintenance Windows (Avoid False Alerts)
```
1. Click monitor → Maintenance Windows
2. Set schedule: e.g., "Every Sunday 2-4 AM" for backups
3. No alerts during maintenance
```

---

## 🔔 Notification Preferences

### Recommended Setup:

**For You (Owner):**
- ✅ Email for all events
- ✅ SMS for health check only (if paid)
- ✅ Weekly reports

**For Team:**
- ✅ Email for DOWN events only
- ❌ No UP notifications (reduces noise)

**For Slack (After Integration):**
- ✅ All events → #finverno-alerts channel

---

## 🆘 Troubleshooting

### Not Receiving Emails?
1. Check spam folder
2. Verify email in Alert Contacts
3. Re-verify email address
4. Check notification settings per monitor

### Monitor Shows Down But Site Works?
1. Check monitor URL is correct
2. Verify no firewall blocking UptimeRobot IPs
3. Check if URL redirects (use final URL)
4. Increase timeout (30s default)

### Too Many Alerts?
1. Increase check interval: 5 min → 10 min
2. Increase "Timeout After": 30s → 60s
3. Enable "Alert After X Failed Checks": 1 → 2
4. Set max notifications: unlimited → 10/hour

### False Positives?
1. Use keyword monitoring (more reliable than HTTP status)
2. Add maintenance windows for known downtime
3. Increase timeout for slow endpoints

---

## 📱 Mobile App (Optional)

Download UptimeRobot app:
- iOS: https://apps.apple.com/app/uptimerobot/id1104878581
- Android: https://play.google.com/store/apps/details?id=com.uptimerobot

Features:
- ✅ Push notifications
- ✅ View all monitors
- ✅ Pause/resume monitoring
- ✅ View incident history
- ✅ Quick response time graphs

---

## 🔗 Integration with Other Tools

### Slack
```
1. UptimeRobot → Settings → Integrations
2. Select "Slack"
3. Authorize workspace
4. Choose channel: #finverno-alerts
5. Select events to notify
```

### PagerDuty
```
1. Get PagerDuty integration email
2. UptimeRobot → Alert Contacts → Email
3. Add PagerDuty email as contact
4. Assign to critical monitors
```

### Zapier
```
1. Connect UptimeRobot to Zapier
2. Create zap: "When monitor goes down → Send SMS via Twilio"
3. Unlimited automation possibilities
```

### Webhooks (For Custom Alerts)
```
1. Edit monitor → Alert Contacts → Webhook
2. Add your webhook URL
3. UptimeRobot will POST JSON:
   {
     "monitorID": 123,
     "monitorName": "Finverno Health Check",
     "monitorURL": "https://finverno.com/api/health",
     "alertType": "1",  // 1=down, 2=up
     "alertDateTime": "2026-03-28 14:23:45"
   }
```

---

## 💰 Free vs Paid Comparison

### Free Tier (What You Get)
- ✅ 50 monitors
- ✅ 5-minute checks
- ✅ Email alerts
- ✅ Public status pages
- ✅ SSL monitoring
- ✅ Unlimited users
- **Cost: $0/month**

### Pro Tier ($7/month)
- ✅ Everything in Free +
- ✅ 1-minute checks (faster alerts)
- ✅ SMS alerts
- ✅ Phone call alerts
- ✅ 20+ integrations
- ✅ Advanced statistics

### When to Upgrade?
- Site is mission-critical
- Revenue loss if down >5 min
- Need SMS/call for on-call team
- Want faster alert response (1 min vs 5 min)

---

## 📈 What Good Uptime Looks Like

### Target Metrics:
- **Uptime**: 99.9%+ (allows ~43 min downtime/month)
- **Response Time**: <2s average
- **Incidents**: <2 per month
- **MTTR**: <30 minutes (Mean Time To Recovery)

### Red Flags:
- ⚠️ Uptime <99%
- ⚠️ Response time >5s consistently
- ⚠️ Multiple incidents per week
- ⚠️ Long recovery times (>1 hour)

---

## 🎯 Quick Actions

### View Dashboard
```bash
open https://uptimerobot.com/dashboard
```

### Check Monitor Status (API)
```bash
curl -X POST https://api.uptimerobot.com/v2/getMonitors \
  -H 'Content-Type: application/json' \
  -d '{"api_key":"YOUR_MAIN_API_KEY","format":"json"}'
```

### Get Your API Key
```
1. Login → My Settings → API Settings
2. Show/Generate Main API Key
3. Copy and save securely
```

---

## ✅ Post-Setup Checklist

After setup, verify:
- [ ] All 4 monitors created and showing "Up"
- [ ] Email verified and receiving test alerts
- [ ] Alert preferences set (DOWN, UP, STARTED)
- [ ] Mobile app installed (optional)
- [ ] Bookmark dashboard: https://uptimerobot.com/dashboard
- [ ] Test one monitor by pausing it
- [ ] Received alert email successfully
- [ ] Resumed monitor

---

## 🆘 Need Help?

- **UptimeRobot Docs**: https://uptimerobot.com/api/
- **Status**: https://status.uptimerobot.com/
- **Support**: support@uptimerobot.com
- **Community**: https://forum.uptimerobot.com/

---

**Setup Time**: ~10 minutes
**Maintenance**: None (fully automated)
**Value**: Instant alerts when site goes down

**Next Step**: Set it up now! → https://uptimerobot.com

---

Last Updated: 2026-03-28
