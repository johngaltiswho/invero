# Security Headers Guide

## Overview

Security headers are HTTP response headers that instruct browsers how to behave when handling your application's content. They provide an additional layer of defense against common web vulnerabilities.

## Implemented Headers

### 1. Content-Security-Policy (CSP)

**Purpose**: Prevents XSS attacks, code injection, and unauthorized resource loading.

**Configuration**:
```
default-src 'self'
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev ...
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https://*.clerk.accounts.dev ...
connect-src 'self' https://*.clerk.accounts.dev https://*.supabase.co ...
```

**What it does**:
- Only allows scripts, styles, and resources from trusted sources
- Blocks inline scripts by default (except where explicitly allowed)
- Prevents loading resources from untrusted domains
- Protects against XSS and data injection attacks

**Customization**:
If you add new third-party services, update the CSP in `next.config.js`:
```javascript
"script-src 'self' https://new-service.com",
"connect-src 'self' https://api.new-service.com",
```

### 2. X-Frame-Options

**Purpose**: Prevents clickjacking attacks.

**Value**: `DENY`

**What it does**:
- Prevents your application from being embedded in `<iframe>`, `<frame>`, or `<object>` tags
- Protects against clickjacking where attackers trick users into clicking hidden elements
- Also enforced by CSP `frame-ancestors 'none'` directive

**Alternative values**:
- `SAMEORIGIN`: Allow framing only from same origin
- `DENY`: Completely block all framing (recommended)

### 3. X-Content-Type-Options

**Purpose**: Prevents MIME type sniffing.

**Value**: `nosniff`

**What it does**:
- Forces browsers to respect the `Content-Type` header
- Prevents browsers from trying to "guess" file types
- Blocks execution of scripts if wrong MIME type is served
- Protects against drive-by download attacks

### 4. Referrer-Policy

**Purpose**: Controls how much referrer information is shared.

**Value**: `strict-origin-when-cross-origin`

**What it does**:
- Sends full URL as referrer for same-origin requests
- Only sends origin (not full URL) for cross-origin requests
- Sends no referrer when downgrading from HTTPS to HTTP
- Protects user privacy while maintaining analytics functionality

**Alternative values**:
- `no-referrer`: Never send referrer (most private)
- `same-origin`: Only send referrer for same-origin
- `strict-origin-when-cross-origin`: Balanced approach (recommended)

### 5. Permissions-Policy

**Purpose**: Restricts browser features and APIs.

**Value**: `camera=(), microphone=(), geolocation=(), interest-cohort=()`

**What it does**:
- Disables access to camera by default
- Blocks microphone access
- Prevents geolocation tracking
- Opts out of Google's FLoC (privacy protection)

**Customization**:
If you need to enable specific features:
```javascript
'camera=(self), microphone=(self), geolocation=()'
```

### 6. X-XSS-Protection

**Purpose**: Legacy XSS protection for older browsers.

**Value**: `1; mode=block`

**What it does**:
- Enables browser's built-in XSS filter (for IE, Edge, Safari)
- Blocks page rendering if XSS attack detected
- Redundant with modern CSP but helps older browsers

**Note**: Modern browsers rely on CSP instead of this header.

### 7. X-DNS-Prefetch-Control

**Purpose**: Controls DNS prefetching.

**Value**: `on`

**What it does**:
- Allows browsers to prefetch DNS for external links
- Improves performance for external resource loading
- Can be set to `off` if you want to prevent DNS leakage

### 8. Strict-Transport-Security (HSTS)

**Purpose**: Enforces HTTPS connections.

**Value**: `max-age=63072000; includeSubDomains; preload` (commented out by default)

**What it does**:
- Forces all connections to use HTTPS
- Prevents downgrade attacks (HTTPS → HTTP)
- Applies to all subdomains
- Can be added to browser preload list

**Important**: Only enable in production with valid HTTPS!

```javascript
// Uncomment in next.config.js when deployed with HTTPS
{
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload',
}
```

## Testing Security Headers

### 1. Using Browser DevTools

1. Open your app in Chrome/Firefox
2. Open DevTools (F12)
3. Go to Network tab
4. Reload the page
5. Click on any request
6. Check "Response Headers" section

You should see all the security headers listed above.

### 2. Using curl

```bash
curl -I https://your-domain.com
```

Look for headers like:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'; ...
```

### 3. Using Online Security Scanners

**securityheaders.com**
```
https://securityheaders.com/?q=https://your-domain.com
```

**Mozilla Observatory**
```
https://observatory.mozilla.org/
```

**Expected Grade**: A or A+

## Common Issues & Solutions

### CSP Violations

**Symptom**: Console errors like "Refused to load the script..."

**Solution**:
1. Check browser console for CSP violation details
2. Add the domain to appropriate CSP directive in `next.config.js`
3. Example:
```javascript
"script-src 'self' https://new-cdn.com",
```

### Clerk Authentication Issues

**Symptom**: Login modal doesn't load or Clerk features break

**Solution**:
Ensure these domains are in CSP:
```javascript
"script-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
"frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
"connect-src 'self' https://api.clerk.com",
```

### Supabase Connection Issues

**Symptom**: API calls to Supabase fail

**Solution**:
Add your Supabase project URL to CSP:
```javascript
"connect-src 'self' https://your-project.supabase.co wss://your-project.supabase.co",
"img-src 'self' https://your-project.supabase.co",
```

### Inline Styles Not Working

**Symptom**: Tailwind or inline styles not applied

**Solution**:
We allow `'unsafe-inline'` for styles to support Tailwind CSS:
```javascript
"style-src 'self' 'unsafe-inline'",
```

For stricter CSP, use CSS-in-JS with nonces.

### Third-Party Scripts Blocked

**Symptom**: Analytics, chat widgets, or other third-party scripts don't load

**Solution**:
Add the third-party domain to CSP:
```javascript
// Example for Google Analytics
"script-src 'self' https://www.googletagmanager.com",
"connect-src 'self' https://www.google-analytics.com",
```

## Best Practices

### 1. Start Strict, Then Relax If Needed

- Begin with most restrictive CSP
- Monitor console for violations
- Add trusted domains only when necessary
- Never use `'unsafe-inline'` for scripts in production

### 2. Test Before Deploying

```bash
# Run dev server
npm run dev

# Test all features:
# - Login/authentication
# - File uploads
# - External API calls
# - Third-party integrations
```

### 3. Monitor CSP Violations

Add CSP reporting:
```javascript
"report-uri https://your-domain.com/api/csp-report",
```

Then create an endpoint to log violations:
```typescript
// src/app/api/csp-report/route.ts
export async function POST(request: Request) {
  const report = await request.json();
  console.error('CSP Violation:', report);
  // Send to monitoring service
  return new Response('OK', { status: 200 });
}
```

### 4. Environment-Specific Headers

```javascript
async headers() {
  const isProd = process.env.NODE_ENV === 'production';

  const headers = [
    // Common headers...
  ];

  if (isProd) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    });
  }

  return [{ source: '/:path*', headers }];
}
```

### 5. Regular Security Audits

Schedule monthly checks:
- [ ] Run securityheaders.com scan
- [ ] Check for CSP violations in logs
- [ ] Review new third-party integrations
- [ ] Update CSP for new services
- [ ] Test all critical flows

## Deployment Checklist

Before deploying to production:

- [ ] Test all authentication flows
- [ ] Verify file uploads work (images, PDFs, etc.)
- [ ] Check third-party integrations (Clerk, Supabase, Sentry)
- [ ] Monitor console for CSP violations
- [ ] Run security header scan
- [ ] Enable HSTS (if using HTTPS)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Verify API calls work correctly

## Additional Resources

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN HTTP Headers Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

## Support

If you encounter issues:
1. Check browser console for specific error messages
2. Review CSP violation details
3. Test with a more permissive CSP temporarily
4. Add necessary domains incrementally
5. Document any custom domains for future reference
