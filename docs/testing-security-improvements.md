# Testing Security Improvements

This guide will help you verify that rate limiting and security headers are working correctly.

## Testing Rate Limiting

### Method 1: Using Browser DevTools (Quick Test)

1. **Start the development server**:
```bash
npm run dev
```

2. **Open Browser DevTools** (F12)

3. **Test a rate-limited endpoint**:
```javascript
// Open Console tab and run this:
async function testRateLimit() {
  const endpoint = '/api/projects'; // or any protected endpoint
  const requests = [];

  // Send 35 requests (exceeds MUTATION limit of 30)
  for (let i = 0; i < 35; i++) {
    requests.push(
      fetch(endpoint)
        .then(res => ({
          status: res.status,
          remaining: res.headers.get('X-RateLimit-Remaining'),
          limit: res.headers.get('X-RateLimit-Limit'),
        }))
    );
  }

  const results = await Promise.all(requests);
  console.table(results);

  // Check if any requests were rate limited (status 429)
  const rateLimited = results.filter(r => r.status === 429);
  console.log(`✅ Rate limited ${rateLimited.length} requests`);
  console.log(`✅ Successful ${results.filter(r => r.status !== 429).length} requests`);
}

testRateLimit();
```

**Expected Result**:
- First ~100-300 requests succeed (depending on endpoint preset)
- Remaining requests return `429 Too Many Requests`
- Headers show `X-RateLimit-Remaining` decreasing
- Rate-limited responses include `Retry-After` header

### Method 2: Using curl (Terminal)

1. **Test GET endpoint**:
```bash
# Send multiple requests quickly
for i in {1..10}; do
  curl -i http://localhost:3000/api/projects \
    -H "Cookie: your-session-cookie" \
    | grep -E "^HTTP|X-RateLimit"
done
```

2. **Test POST endpoint** (more strict limit):
```bash
# This should hit rate limit faster (30 req/min)
for i in {1..35}; do
  curl -i -X POST http://localhost:3000/api/projects \
    -H "Cookie: your-session-cookie" \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    | grep -E "^HTTP|X-RateLimit|Retry-After"
done
```

**Expected Output**:
```
HTTP/2 200
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29

HTTP/2 200
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28

...

HTTP/2 429
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
Retry-After: 45
```

### Method 3: Manual Testing via UI

1. **Login to your application**

2. **Rapidly click a button** that triggers API calls (e.g., "Create Project")

3. **Check Network tab** in DevTools:
   - Look for 429 responses
   - Check response headers for rate limit info
   - Verify error message in response body

**Expected Error Response**:
```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": "45 seconds"
}
```

### Verifying Different Presets

| Endpoint | Preset | Window | Max Requests | Test With |
|----------|--------|--------|--------------|-----------|
| `GET /api/projects` | READ_ONLY | 1 min | 300 | Refresh page 301 times |
| `POST /api/projects` | MUTATION | 1 min | 30 | Submit form 31 times |
| `GET /api/purchase-requests` | READ_ONLY | 1 min | 300 | Query multiple times |
| `POST /api/purchase-requests` | MUTATION | 1 min | 30 | Create 31 requests |

## Testing Security Headers

### Method 1: Using Browser DevTools

1. **Open your application** in Chrome/Firefox

2. **Open DevTools** (F12) → Network tab

3. **Reload the page** (Ctrl+R or Cmd+R)

4. **Click on the first request** (usually the HTML document)

5. **Scroll to Response Headers** section

**Expected Headers**:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
X-XSS-Protection: 1; mode=block
X-DNS-Prefetch-Control: on
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'...
```

### Method 2: Using curl

```bash
curl -I http://localhost:3000
```

**Expected Output**:
```
HTTP/1.1 200 OK
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' ...
X-XSS-Protection: 1; mode=block
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

### Method 3: Online Security Scanners

Once deployed to production:

1. **Security Headers Scanner**:
   ```
   https://securityheaders.com/?q=https://your-domain.com
   ```
   **Expected Grade**: A or A+

2. **Mozilla Observatory**:
   ```
   https://observatory.mozilla.org/
   ```
   **Expected Score**: 90+ out of 100

3. **CSP Evaluator**:
   ```
   https://csp-evaluator.withgoogle.com/
   ```
   Paste your CSP and check for issues

## Testing CSP Compliance

### Check for CSP Violations

1. **Open browser console** (F12)

2. **Look for CSP errors**:
```
Refused to load the script 'https://untrusted-domain.com/script.js'
because it violates the following Content Security Policy directive:
"script-src 'self' https://trusted-domain.com"
```

3. **If you see violations**:
   - If it's a trusted service, add it to `next.config.js` CSP
   - If it's untrusted, investigate why it's trying to load

### Test Critical Flows

After implementing security headers, test these flows:

- [ ] **Login/Authentication** (Clerk modal should work)
- [ ] **File Upload** (Images, PDFs to Supabase)
- [ ] **API Calls** (All CRUD operations)
- [ ] **Third-party Services** (Sentry error reporting)
- [ ] **Inline Styles** (Tailwind classes should apply)
- [ ] **External Links** (Should open correctly)

## Automated Testing Script

Save this as `test-security.sh`:

```bash
#!/bin/bash

echo "🔒 Testing Security Improvements"
echo "================================"
echo ""

BASE_URL="http://localhost:3000"

# Test Security Headers
echo "📋 Checking Security Headers..."
HEADERS=$(curl -sI "$BASE_URL" | grep -E "X-Frame-Options|X-Content-Type-Options|Content-Security-Policy|Referrer-Policy")

if [ -z "$HEADERS" ]; then
  echo "❌ Security headers NOT found"
else
  echo "✅ Security headers present:"
  echo "$HEADERS"
fi

echo ""

# Test Rate Limiting
echo "🚦 Testing Rate Limiting..."
echo "Sending 35 rapid requests to /api/projects..."

SUCCESS=0
RATE_LIMITED=0

for i in {1..35}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/projects" 2>/dev/null)
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "401" ]; then
    ((SUCCESS++))
  elif [ "$STATUS" = "429" ]; then
    ((RATE_LIMITED++))
  fi
done

echo "✅ Successful requests: $SUCCESS"
echo "✅ Rate limited requests: $RATE_LIMITED"

if [ $RATE_LIMITED -gt 0 ]; then
  echo "✅ Rate limiting is working!"
else
  echo "⚠️  No rate limiting detected (may need authentication)"
fi

echo ""
echo "📊 Summary:"
echo "- Security headers: $([ -z "$HEADERS" ] && echo "❌ Missing" || echo "✅ Present")"
echo "- Rate limiting: $([ $RATE_LIMITED -gt 0 ] && echo "✅ Active" || echo "⚠️  Check manually")"
```

Run it:
```bash
chmod +x test-security.sh
./test-security.sh
```

## Production Verification

After deploying to production:

### 1. Security Headers Check

```bash
curl -I https://your-production-domain.com
```

**Must have**:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy: ...`
- `Strict-Transport-Security: ...` (if HTTPS)

### 2. Rate Limiting Check

Create a simple test:
```javascript
// In browser console on production site
async function prodRateLimitTest() {
  const results = [];
  for (let i = 0; i < 35; i++) {
    const res = await fetch('/api/projects');
    results.push({
      attempt: i + 1,
      status: res.status,
      remaining: res.headers.get('X-RateLimit-Remaining'),
    });
  }
  console.table(results);
}
```

### 3. Full Security Scan

Run these tools against production:
1. https://securityheaders.com/
2. https://observatory.mozilla.org/
3. https://www.ssllabs.com/ssltest/ (for HTTPS)

## Troubleshooting

### Rate Limiting Not Working

**Symptoms**:
- No 429 errors even after many requests
- Missing X-RateLimit headers

**Checks**:
1. Verify rate limit middleware is imported in route files
2. Check if `rateLimit()` is called before other logic
3. Clear in-memory store: `clearAllRateLimits()`
4. Check server logs for errors

### CSP Blocking Resources

**Symptoms**:
- Console shows CSP violations
- Features not working (login, uploads, etc.)

**Solution**:
1. Check console for exact violation
2. Add domain to appropriate CSP directive
3. Restart dev server
4. Test again

### Headers Not Appearing

**Symptoms**:
- curl shows no security headers
- Online scanners show missing headers

**Checks**:
1. Restart Next.js server
2. Clear browser cache
3. Verify `next.config.js` has headers() function
4. Check for syntax errors in config

## Success Criteria

Your implementation is successful when:

✅ **Rate Limiting**:
- 429 status code after exceeding limits
- X-RateLimit headers present in all API responses
- Different limits for GET vs POST endpoints
- Retry-After header in rate-limited responses

✅ **Security Headers**:
- Grade A or A+ on securityheaders.com
- All expected headers present in responses
- No CSP violations in console for normal usage
- All application features work correctly

✅ **Production Ready**:
- HSTS enabled (for HTTPS)
- No console errors
- All critical flows tested
- Monitoring in place

## Next Steps

After testing:

1. **Monitor in production**:
   - Track rate limit violations in Sentry
   - Watch for CSP violations
   - Monitor performance impact

2. **Document any custom changes**:
   - Additional CSP domains
   - Custom rate limits per endpoint
   - Whitelist for specific users

3. **Schedule regular reviews**:
   - Monthly security scans
   - Quarterly CSP review
   - Update docs with new services

## Need Help?

If tests fail:
1. Check the error messages carefully
2. Review the configuration files
3. Verify all imports are correct
4. Test in isolation (one feature at a time)
5. Check the documentation guides for details
