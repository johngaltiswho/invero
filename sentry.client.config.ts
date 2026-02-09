// This file configures the initialization of Sentry on the client.
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

    // Enable session replay on errors only (not all sessions)
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0, // Disable replays for regular sessions to save costs

    // Session Replay
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Filter out non-actionable errors
    beforeSend(event, hint) {
      // Filter out network errors (can't fix these)
      const error = hint?.originalException as Error;
      if (error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('NetworkError')) {
        return null;
      }
      return event;
    },

    // Ignore common browser extension errors
    ignoreErrors: [
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'fb_xd_fragment',
      'Failed to fetch',
      'NetworkError',
      'Network request failed',
      'Load failed',
    ],
  });
}
