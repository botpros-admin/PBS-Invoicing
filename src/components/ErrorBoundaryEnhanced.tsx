/**
 * Enhanced React Error Boundary with recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { errorHandler, AppError, ErrorSeverity } from '../lib/errorHandler';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  allowRecovery?: boolean;
}

interface State {
  hasError: boolean;
  error: AppError | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
}

export class ErrorBoundaryEnhanced extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();
    const timeSinceLastError = now - this.state.lastErrorTime;
    
    // Track error frequency
    let errorCount = this.state.errorCount;
    if (timeSinceLastError < 10000) {
      // If errors occur within 10 seconds, increment count
      errorCount++;
    } else {
      // Reset count if enough time has passed
      errorCount = 1;
    }

    // Handle the error
    const appError = errorHandler.handleError(error, {
      severity: errorCount > 3 ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
      details: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        errorCount,
      },
    });

    // Update state
    this.setState({
      error: appError,
      errorInfo,
      errorCount,
      lastErrorTime: now,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to monitoring
    logger.error('React Error Boundary caught error', error, {
      component: 'ErrorBoundary',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorCount,
      },
    });

    // Auto-recovery attempt for non-critical errors
    if (this.props.allowRecovery && appError.recoverable && errorCount <= 3) {
      this.scheduleAutoRecovery();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  scheduleAutoRecovery = () => {
    this.retryTimeoutId = setTimeout(() => {
      logger.info('Attempting auto-recovery from error boundary');
      this.handleReset();
    }, 5000);
  };

  handleReset = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const { error, errorInfo } = this.state;
    const errorReport = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Copy error details to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
    alert('Error details copied to clipboard. Please include them in your bug report.');
  };

  renderErrorDetails() {
    const { error, errorInfo } = this.state;
    if (!this.props.showDetails || !error) return null;

    return (
      <details className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <summary className="cursor-pointer font-semibold text-sm text-gray-600 dark:text-gray-400">
          Technical Details (for developers)
        </summary>
        <div className="mt-2 space-y-2">
          <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
            <p><strong>Error:</strong> {error.message}</p>
            <p><strong>Code:</strong> {error.code}</p>
            <p><strong>Category:</strong> {error.category}</p>
            <p><strong>Severity:</strong> {error.severity}</p>
          </div>
          {error.stack && (
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
              {error.stack}
            </pre>
          )}
          {errorInfo?.componentStack && (
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
              {errorInfo.componentStack}
            </pre>
          )}
        </div>
      </details>
    );
  }

  render() {
    const { hasError, error, errorCount } = this.state;

    if (hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Determine severity-based styling
      const isHighSeverity = error?.severity === ErrorSeverity.HIGH || 
                            error?.severity === ErrorSeverity.CRITICAL;
      const isCritical = error?.severity === ErrorSeverity.CRITICAL || errorCount > 3;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <Alert variant={isCritical ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {isCritical 
                  ? "Critical Error Occurred" 
                  : isHighSeverity 
                    ? "Something went wrong"
                    : "Oops! An error occurred"}
              </AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-4">
                  {error?.userMessage || "We're sorry, but something unexpected happened. Please try again."}
                </p>
                
                {errorCount > 1 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    This error has occurred {errorCount} times.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {error?.recoverable !== false && (
                    <Button
                      onClick={this.handleReset}
                      variant="default"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                  )}
                  
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </Button>
                  
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                  
                  {process.env.NODE_ENV === 'development' && (
                    <Button
                      onClick={this.handleReportBug}
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Bug className="h-4 w-4" />
                      Copy Error
                    </Button>
                  )}
                </div>

                {this.renderErrorDetails()}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryEnhanced {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundaryEnhanced>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default ErrorBoundaryEnhanced;