/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add empty turbopack config to silence the warning
  turbopack: {},
  // Security headers for enterprise-grade protection
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Restrict browser features and APIs
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Legacy XSS protection (for older browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // DNS prefetch control
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Enforce HTTPS (only in production)
          // Uncomment when deployed with HTTPS
          // {
          //   key: 'Strict-Transport-Security',
          //   value: 'max-age=63072000; includeSubDomains; preload',
          // },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              // Default to same origin
              "default-src 'self'",
              // Scripts: Allow self, Clerk, Sentry, Next.js, and inline with nonce
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.finverno.com https://challenges.cloudflare.com https://js.sentry-cdn.com",
              // Styles: Allow self and inline styles (required for Tailwind)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: Allow self, data URIs, blob, Clerk, Supabase storage
              "img-src 'self' data: blob: https://*.clerk.accounts.dev https://*.clerk.com https://clerk.finverno.com https://*.supabase.co https://*.supabase.in",
              // Fonts: Allow self, data URIs, and Google Fonts
              "font-src 'self' data: https://fonts.gstatic.com",
              // Connect (API calls): Allow self, Clerk, Supabase, Sentry
              "connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.com https://*.clerk.com https://clerk.finverno.com https://*.supabase.co https://*.supabase.in https://*.sentry.io https://sentry.io wss://*.supabase.co",
              // Frames: Allow Clerk and Cloudflare
              "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.finverno.com https://challenges.cloudflare.com",
              // Media: Allow self and blob
              "media-src 'self' blob:",
              // Objects: Disallow plugins
              "object-src 'none'",
              // Base URI: Restrict to same origin
              "base-uri 'self'",
              // Form actions: Allow same origin
              "form-action 'self'",
              // Frame ancestors: Deny (same as X-Frame-Options)
              "frame-ancestors 'none'",
              // Upgrade insecure requests in production
              // "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },
  // Disable webpack polyfills for Node.js modules in client-side bundles
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // Handle PDF.js worker file
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    return config;
  },
};

module.exports = nextConfig;