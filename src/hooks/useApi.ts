import { useState, useCallback, useRef } from 'react';
import { useToast } from '../context/ToastContext';

interface UseApiOptions {
  showSuccessToast?: boolean;
  successMessage?: string;
  showErrorToast?: boolean;
  errorMessage?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseApiResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  execute: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * Custom hook for API calls with built-in error handling and user feedback
 * 
 * @param apiFunction - The API function to call (must return a Promise)
 * @param options - Configuration options for the hook
 * @returns Object containing data, error, loading state, and execute function
 * 
 * @example
 * const { data, error, isLoading, execute } = useApi(
 *   fetchInvoices,
 *   { 
 *     successMessage: 'Invoices loaded successfully',
 *     errorMessage: 'Failed to load invoices'
 *   }
 * );
 */
export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { showSuccess, showError: showErrorToast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    showSuccessToast = false,
    successMessage = 'Operation completed successfully',
    showErrorToast = true,
    errorMessage = 'An error occurred',
    onSuccess,
    onError,
  } = options;

  const execute = useCallback(
    async (...args: any[]): Promise<T | undefined> => {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        // Pass abort signal if the API function supports it
        const result = await apiFunction(...args, { signal: abortControllerRef.current.signal });
        
        setData(result);
        
        if (showSuccessToast) {
          showSuccess(successMessage);
        }
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'AbortError') {
          return undefined;
        }

        const errorObj = err instanceof Error ? err : new Error(err?.message || errorMessage);
        
        setError(errorObj);
        
        if (showErrorToast) {
          const message = errorObj.message || errorMessage;
          showErrorToast(message);
        }
        
        if (onError) {
          onError(errorObj);
        }
        
        console.error('API Error:', errorObj);
        return undefined;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [apiFunction, showSuccessToast, successMessage, showErrorToast, errorMessage, onSuccess, onError, showSuccess, showErrorToast]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    data,
    error,
    isLoading,
    execute,
    reset,
  };
}

/**
 * Mutation hook for API calls that modify data
 * Provides additional features like optimistic updates
 */
export function useApiMutation<T, TArgs = any>(
  apiFunction: (args: TArgs) => Promise<T>,
  options: UseApiOptions & { 
    optimisticUpdate?: (args: TArgs) => void;
    rollbackOnError?: () => void;
  } = {}
): UseApiResult<T> & { mutate: (args: TArgs) => Promise<T | undefined> } {
  const api = useApi(apiFunction, options);
  const { optimisticUpdate, rollbackOnError } = options;

  const mutate = useCallback(
    async (args: TArgs): Promise<T | undefined> => {
      // Perform optimistic update if provided
      if (optimisticUpdate) {
        optimisticUpdate(args);
      }

      try {
        const result = await api.execute(args);
        return result;
      } catch (err) {
        // Rollback optimistic update on error
        if (rollbackOnError) {
          rollbackOnError();
        }
        throw err;
      }
    },
    [api.execute, optimisticUpdate, rollbackOnError]
  );

  return {
    ...api,
    mutate,
  };
}