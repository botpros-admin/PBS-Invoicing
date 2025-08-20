import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logError, ApiError } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode; // Optional fallback UI
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with context
    const correlationId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logError(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
      correlationId
    });
    
    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorCount } = this.state;
      const tooManyErrors = errorCount > 3;
      
      // Determine if it's an ApiError for better messaging
      const isApiError = error && 'code' in error && 'status' in error;
      const errorMessage = error?.message || 'An unexpected error has occurred.';
      const correlationId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <div className="max-w-md w-full space-y-8">
            <div className="bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-center">
                <div className="rounded-full p-3 bg-red-100">
                  <AlertTriangle className="h-12 w-12 text-red-600" />
                </div>
              </div>

              <div className="mt-4 text-center">
                <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
                <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
                
                {tooManyErrors && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                    <p className="text-sm text-yellow-800">
                      Multiple errors detected. A full page reload is recommended.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                {!tooManyErrors ? (
                  <button
                    onClick={this.handleReset}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </button>
                ) : (
                  <button
                    onClick={this.handleReload}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Page
                  </button>
                )}
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Home
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">
                    {this.state.error.toString()}
                    <br />
                    {this.state.error.stack}
                    {this.state.errorInfo && (
                      <>
                        <br /><br />Component Stack:
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </details>
              )}

              {correlationId && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    Error ID: <span className="font-mono">{correlationId}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
