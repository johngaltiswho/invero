// This file configures the initialization of Sentry for edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize if DSN is provided
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Sample rate for performance monitoring
    tracesSampleRate: 0.1,

    // Only enable debug mode in development
    debug: process.env.NODE_ENV === 'development',

    // Environment information
    environment: process.env.NODE_ENV || 'development',
  });
}
