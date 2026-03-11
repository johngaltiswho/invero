// This file configures the initialization of Sentry on the server.
// Automatically imported by Next.js when Sentry is installed
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize if DSN is provided
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Sample rate for performance monitoring (1 = 100%)
    tracesSampleRate: 0.1, // 10% in production to reduce costs

    // Only enable debug mode in development
    debug: process.env.NODE_ENV === 'development',

    // Environment information
    environment: process.env.NODE_ENV || 'development',

    // Server-specific integrations
    integrations: [
      // Capture console errors
      Sentry.captureConsoleIntegration({
        levels: ['error'],
      }),
    ],

    // Add custom context to all events
    beforeSend(event, hint) {
      // Add server-side context
      if (event.request) {
        event.contexts = event.contexts || {};
        event.contexts.runtime = {
          name: 'node',
          version: process.version,
        };
      }

      // Filter out non-actionable errors
      const error = hint?.originalException as Error;

      // Ignore expected errors
      if (error?.message?.includes('ECONNREFUSED') ||
          error?.message?.includes('ENOTFOUND') ||
          error?.message?.includes('socket hang up')) {
        return null;
      }

      // Ignore authentication errors (these are expected)
      if (error?.message?.includes('Authentication required') ||
          error?.message?.includes('Admin access required')) {
        return null;
      }

      return event;
    },

    // Ignore expected errors
    ignoreErrors: [
      'ECONNREFUSED',
      'ENOTFOUND',
      'socket hang up',
      'ETIMEDOUT',
      'Authentication required',
      'Admin access required',
      'Not authenticated',
      'Forbidden',
    ],
  });
}
