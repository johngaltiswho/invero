/**
 * Monitoring and Error Tracking Utilities
 *
 * Enhances Sentry with custom tracking for Finverno-specific events.
 * Provides structured error reporting and performance monitoring.
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Track a custom event with context
 */
export function trackEvent(
  eventName: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Event] ${eventName}:`, data);
    return;
  }

  Sentry.captureMessage(eventName, {
    level,
    extra: data,
    tags: {
      event_type: 'custom',
    },
  });
}

/**
 * Track BOQ analysis completion
 */
export function trackBOQAnalysis(data: {
  projectId: string;
  fileName: string;
  analysisTime: number;
  success: boolean;
  itemCount?: number;
  errorMessage?: string;
}) {
  trackEvent('BOQ Analysis Completed', data, data.success ? 'info' : 'warning');
}

/**
 * Track file upload
 */
export function trackFileUpload(data: {
  projectId: string;
  fileType: string;
  fileSize: number;
  category: string;
  success: boolean;
  errorMessage?: string;
}) {
  trackEvent('File Uploaded', data, data.success ? 'info' : 'error');
}

/**
 * Track Google Drive operation
 */
export function trackGoogleDrive(data: {
  operation: 'upload' | 'create_sheet' | 'export' | 'sync';
  projectId: string;
  fileName: string;
  duration: number;
  success: boolean;
  errorMessage?: string;
}) {
  trackEvent('Google Drive Operation', data, data.success ? 'info' : 'error');
}

/**
 * Track payment/transaction
 */
export function trackTransaction(data: {
  type: 'payment' | 'invoice' | 'capital_transfer';
  amount: number;
  contractorId?: string;
  projectId?: string;
  success: boolean;
  errorMessage?: string;
}) {
  trackEvent('Transaction', data, data.success ? 'info' : 'warning');
}

/**
 * Track user authentication events
 */
export function trackAuth(data: {
  action: 'login' | 'logout' | 'signup' | 'failed_login';
  userId?: string;
  userType?: 'contractor' | 'investor' | 'admin';
  errorMessage?: string;
}) {
  trackEvent('Authentication', data, data.action === 'failed_login' ? 'warning' : 'info');
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email: string;
  type: 'contractor' | 'investor' | 'admin';
  companyName?: string;
}) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[User Context]', user);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.companyName,
    type: user.type,
  });

  Sentry.setTag('user_type', user.type);
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Track API call performance
 */
export function trackAPICall(data: {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  errorMessage?: string;
}) {
  if (data.status >= 400) {
    trackEvent('API Error', data, data.status >= 500 ? 'error' : 'warning');
  } else if (data.duration > 3000) {
    // Slow API call (> 3 seconds)
    trackEvent('Slow API Call', data, 'warning');
  }
}

/**
 * Capture error with enhanced context
 */
export function captureError(
  error: Error,
  context?: {
    feature?: string;
    action?: string;
    userId?: string;
    projectId?: string;
    [key: string]: any;
  }
) {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
    tags: {
      feature: context?.feature,
      action: context?.action,
    },
  });
}

/**
 * Start a performance span (measurement)
 */
export function startPerformanceSpan(name: string, op: string) {
  if (process.env.NODE_ENV === 'development') {
    const startTime = Date.now();
    return {
      end: () => {
        console.log(`[Performance] ${name} took ${Date.now() - startTime}ms`);
      },
    };
  }

  // Use Sentry v10+ API for performance monitoring
  return Sentry.startSpan({ name, op }, (span) => span);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  category = 'action'
) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Breadcrumb] ${category}: ${message}`, data);
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Convenience methods for common breadcrumbs
 */
export const breadcrumbs = {
  click: (element: string, data?: Record<string, any>) =>
    addBreadcrumb(`Clicked ${element}`, data, 'ui.click'),

  navigation: (from: string, to: string) =>
    addBreadcrumb(`Navigated from ${from} to ${to}`, { from, to }, 'navigation'),

  apiCall: (endpoint: string, method: string) =>
    addBreadcrumb(`API ${method} ${endpoint}`, { endpoint, method }, 'http'),

  stateChange: (component: string, newState: any) =>
    addBreadcrumb(`${component} state changed`, { newState }, 'state'),
};

/**
 * Track feature usage
 */
export function trackFeatureUsage(feature: string, action: string, data?: Record<string, any>) {
  trackEvent(`Feature: ${feature} - ${action}`, data, 'info');
}

/**
 * Alert for critical errors
 */
export function alertCritical(message: string, data?: Record<string, any>) {
  captureError(new Error(message), {
    ...data,
    severity: 'critical',
  });

  // In production, this would also:
  // - Send to PagerDuty
  // - Post to Slack
  // - Send SMS to on-call engineer
}
