/**
 * Simple error monitoring utility for server-side errors
 * Use this in API routes and server components to log errors to Sentry
 */

// Note: Sentry is only imported if DSN is configured
let Sentry: any = null;

// Only initialize Sentry if DSN is provided
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    Sentry = require('@sentry/nextjs');
  } catch (e) {
    console.warn('Sentry not available');
  }
}

interface ErrorContext {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
  request?: {
    method?: string;
    url?: string;
    params?: Record<string, any>;
  };
  extra?: Record<string, any>;
}

/**
 * Log an error to Sentry (if configured) and console
 * @param error - The error to log
 * @param context - Additional context about the error
 * @returns The Sentry event ID if captured, or null
 */
export function logError(error: Error | unknown, context?: ErrorContext): string | null {
  // Always log to console for development
  console.error('[Error]', error, context);

  // Log to Sentry if available
  if (Sentry) {
    try {
      Sentry.withScope((scope: any) => {
        // Add user context
        if (context?.user) {
          scope.setUser({
            id: context.user.id,
            email: context.user.email,
            role: context.user.role,
          });
        }

        // Add request context
        if (context?.request) {
          scope.setContext('request', {
            method: context.request.method,
            url: context.request.url,
            params: context.request.params,
          });
        }

        // Add extra context
        if (context?.extra) {
          scope.setContext('extra', context.extra);
        }

        // Capture the error
        const eventId = Sentry.captureException(error);
        return eventId;
      });
    } catch (sentryError) {
      console.error('[Sentry Error]', sentryError);
      return null;
    }
  }

  return null;
}

/**
 * Log a message to Sentry (if configured) and console
 * Useful for non-error issues you want to track
 */
export function logMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
  console.log(`[${level.toUpperCase()}]`, message, context);

  if (Sentry) {
    try {
      Sentry.withScope((scope: any) => {
        if (context?.user) {
          scope.setUser(context.user);
        }
        if (context?.extra) {
          scope.setContext('extra', context.extra);
        }
        Sentry.captureMessage(message, level);
      });
    } catch (sentryError) {
      console.error('[Sentry Error]', sentryError);
    }
  }
}

/**
 * Wrap an API route handler with error logging
 * Usage: export const POST = withErrorLogging(async (req) => { ... })
 */
export function withErrorLogging<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  routeName?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      logError(error, {
        extra: {
          route: routeName,
          args: JSON.stringify(args[0]?.url || 'unknown'),
        },
      });

      // Return error response
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Internal server error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }) as T;
}
