/**
 * Sentry Error Monitoring Utilities
 * Custom helpers for enterprise error tracking and monitoring
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    role: user.role,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add custom tags to error events
 */
export function setSentryTags(tags: Record<string, string | number | boolean>) {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
}

/**
 * Add custom context to error events
 */
export function setSentryContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

/**
 * Capture a custom error with context
 */
export function captureError(error: Error, context?: {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, any>;
  level?: Sentry.SeverityLevel;
}) {
  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      scope.setContext('additional_data', context.extra);
    }

    if (context?.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, any>;
}) {
  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      scope.setContext('additional_data', context.extra);
    }

    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Track purchase request errors
 */
export function capturePurchaseRequestError(error: Error, prId: string, context?: {
  contractor_id?: string;
  status?: string;
  action?: string;
}) {
  captureError(error, {
    tags: {
      error_type: 'purchase_request',
      purchase_request_id: prId,
      ...context,
    },
    extra: {
      purchase_request_id: prId,
      ...context,
    },
    level: 'error',
  });
}

/**
 * Track capital transaction errors
 */
export function captureCapitalTransactionError(error: Error, txnId: string, context?: {
  investor_id?: string;
  transaction_type?: string;
  amount?: number;
}) {
  captureError(error, {
    tags: {
      error_type: 'capital_transaction',
      transaction_id: txnId,
      ...context,
    },
    extra: {
      transaction_id: txnId,
      ...context,
    },
    level: 'error',
  });
}

/**
 * Track invoice generation errors
 */
export function captureInvoiceError(error: Error, prId: string, context?: {
  contractor_id?: string;
  invoice_number?: string;
}) {
  captureError(error, {
    tags: {
      error_type: 'invoice_generation',
      purchase_request_id: prId,
      ...context,
    },
    extra: {
      purchase_request_id: prId,
      ...context,
    },
    level: 'error',
  });
}

/**
 * Track delivery/dispatch errors
 */
export function captureDeliveryError(error: Error, prId: string, context?: {
  delivery_status?: string;
  action?: string;
}) {
  captureError(error, {
    tags: {
      error_type: 'delivery',
      purchase_request_id: prId,
      ...context,
    },
    extra: {
      purchase_request_id: prId,
      ...context,
    },
    level: 'error',
  });
}

/**
 * Track database errors
 */
export function captureDatabaseError(error: Error, operation: string, table?: string) {
  captureError(error, {
    tags: {
      error_type: 'database',
      operation,
      table: table || 'unknown',
    },
    extra: {
      operation,
      table,
      error_message: error.message,
    },
    level: 'error',
  });
}

/**
 * Track API errors
 */
export function captureAPIError(error: Error, endpoint: string, method: string, statusCode?: number) {
  captureError(error, {
    tags: {
      error_type: 'api',
      endpoint,
      method,
      status_code: statusCode || 'unknown',
    },
    extra: {
      endpoint,
      method,
      status_code: statusCode,
      error_message: error.message,
    },
    level: 'error',
  });
}

/**
 * Track validation errors
 */
export function captureValidationError(
  error: Error,
  endpoint: string,
  validationErrors: Array<{ field: string; message: string }>
) {
  captureError(error, {
    tags: {
      error_type: 'validation',
      endpoint,
      field_count: validationErrors.length,
    },
    extra: {
      endpoint,
      validation_errors: validationErrors,
    },
    level: 'warning', // Validation errors are expected, log as warning
  });
}

/**
 * Create a breadcrumb for tracing user actions
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'user-action',
    level: 'info',
    data,
  });
}

/**
 * Start a performance span (replaces deprecated startTransaction)
 */
export function startSpan<T>(
  name: string,
  op: string,
  callback: () => T
): T {
  return Sentry.startSpan(
    {
      name,
      op,
    },
    callback
  );
}

/**
 * Track slow database queries
 */
export async function trackDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  slowThreshold: number = 1000 // milliseconds
): Promise<T> {
  return Sentry.startSpan(
    {
      name: queryName,
      op: 'db.query',
    },
    async () => {
      const startTime = Date.now();

      try {
        const result = await queryFn();
        const duration = Date.now() - startTime;

        if (duration > slowThreshold) {
          captureMessage(`Slow database query: ${queryName}`, 'warning', {
            tags: {
              query_name: queryName,
              duration,
            },
            extra: {
              duration,
              threshold: slowThreshold,
            },
          });
        }

        return result;
      } catch (error) {
        captureDatabaseError(error as Error, queryName);
        throw error;
      }
    }
  );
}
