import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorMessageProps {
  title?: string;
  message: string;
  error?: Error | null;
  onRetry?: () => void;
  showHomeButton?: boolean;
  showDetails?: boolean;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  showHomeButton = true,
  showDetails = true,
  className = '',
}) => {
  const navigate = useNavigate();
  const [isDetailsExpanded, setIsDetailsExpanded] = React.useState(false);

  const errorDetails = error?.stack || error?.message || '';

  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] p-8 ${className}`}>
      <div className="max-w-md w-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-red-800">{title}</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{message}</p>
              </div>
              
              {showDetails && errorDetails && (
                <div className="mt-4">
                  <button
                    onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                    className="flex items-center text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    {isDetailsExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Hide details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Show details
                      </>
                    )}
                  </button>
                  
                  {isDetailsExpanded && (
                    <div className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 font-mono overflow-auto max-h-48">
                      <pre className="whitespace-pre-wrap break-words">{errorDetails}</pre>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-6 flex gap-3">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try again
                  </button>
                )}
                
                {showHomeButton && (
                  <button
                    onClick={() => navigate('/billing')}
                    className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to Billing Hub
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;