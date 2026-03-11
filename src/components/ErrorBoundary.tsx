'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDialog?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches React errors and reports them to Sentry
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to Sentry
    Sentry.withScope((scope) => {
      scope.setContext('react_error_boundary', {
        componentStack: errorInfo.componentStack,
      });
      Sentry.captureException(error);
    });

    // Show error dialog if enabled
    if (this.props.showDialog) {
      Sentry.showReportDialog({
        eventId: Sentry.lastEventId() || '',
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-lightest via-primary-lighter to-accent-amber/10 p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full">
              <svg
                className="w-8 h-8 text-error"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-neutral-darker text-center mb-2">
              Something went wrong
            </h1>

            <p className="text-neutral-dark text-center mb-6">
              We're sorry for the inconvenience. Our team has been notified and is working on a fix.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-error/5 border border-error/20 rounded text-xs overflow-auto">
                <pre className="text-error whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 bg-primary-default hover:bg-primary-darker text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Reload Page
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="flex-1 bg-neutral-light hover:bg-neutral-default text-neutral-darker font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Go Home
              </button>
            </div>

            {this.props.showDialog && (
              <button
                onClick={() => {
                  Sentry.showReportDialog({
                    eventId: Sentry.lastEventId() || '',
                  });
                }}
                className="w-full mt-3 text-sm text-neutral-dark hover:text-primary-default transition-colors"
              >
                Report this issue
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simplified error boundary for smaller components
 */
export function SimpleErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-error/5 border border-error/20 rounded-lg">
          <p className="text-error text-sm">Something went wrong loading this component.</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
