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

    // Add custom context and filter errors
    beforeSend(event, hint) {
      // Add browser context
      event.contexts = event.contexts || {};
      event.contexts.browser_info = {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height,
        },
      };

      // Filter out non-actionable errors
      const error = hint?.originalException as Error;
      if (error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('NetworkError')) {
        return null;
      }

      // Filter out validation errors (these are expected and handled)
      if (event.exception?.values?.[0]?.type === 'ValidationError') {
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
