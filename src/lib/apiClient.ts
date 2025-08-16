/**
 * Enhanced API client with error handling, retries, and logging
 */

import { errorHandler, ErrorCategory, AppError } from './errorHandler';
import { logger } from './logger';

export interface ApiRequestOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  skipAuth?: boolean;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: AppError;
  status: number;
  headers: Headers;
}

class ApiClient {
  private static instance: ApiClient;
  private baseURL: string;
  private defaultTimeout: number = 30000; // 30 seconds
  private authToken: string | null = null;
  private requestInterceptors: Array<(config: ApiRequestOptions) => ApiRequestOptions> = [];
  private responseInterceptors: Array<(response: Response) => Response> = [];

  private constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    this.setupInterceptors();
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private setupInterceptors() {
    // Add default request interceptor for auth
    this.addRequestInterceptor((config) => {
      if (!config.skipAuth && this.authToken) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${this.authToken}`,
        };
      }
      return config;
    });

    // Add default response interceptor for error handling
    this.addResponseInterceptor((response) => {
      if (!response.ok) {
        logger.warn(`API response error: ${response.status} ${response.statusText}`, {
          component: 'ApiClient',
          metadata: { url: response.url, status: response.status },
        });
      }
      return response;
    });
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  addRequestInterceptor(interceptor: (config: ApiRequestOptions) => ApiRequestOptions) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: Response) => Response) {
    this.responseInterceptors.push(interceptor);
  }

  private async executeWithTimeout(
    promise: Promise<Response>,
    timeout: number
  ): Promise<Response> {
    return Promise.race([
      promise,
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const headers = response.headers;
    const status = response.status;

    try {
      if (response.ok) {
        const contentType = headers.get('content-type');
        let data: T;

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else if (contentType?.includes('text/')) {
          data = (await response.text()) as unknown as T;
        } else {
          data = (await response.blob()) as unknown as T;
        }

        return { data, status, headers };
      } else {
        // Handle error responses
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        const error = errorHandler.createApiError(
          errorData.message || `Request failed with status ${status}`,
          status,
          this.getErrorCategory(status),
          errorData
        );

        return { error, status, headers };
      }
    } catch (error) {
      const appError = errorHandler.handleError(error as Error, {
        category: ErrorCategory.NETWORK,
      });
      return { error: appError, status: 0, headers };
    }
  }

  private getErrorCategory(status: number): ErrorCategory {
    if (status === 401) return ErrorCategory.AUTHENTICATION;
    if (status === 403) return ErrorCategory.AUTHORIZATION;
    if (status >= 400 && status < 500) return ErrorCategory.VALIDATION;
    if (status >= 500) return ErrorCategory.SYSTEM;
    return ErrorCategory.UNKNOWN;
  }

  private async executeRequest<T>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      retries = 3,
      retryDelay = 1000,
      timeout = this.defaultTimeout,
      ...fetchOptions
    } = options;

    // Apply request interceptors
    let config = { ...fetchOptions };
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config);
    }

    // Add default headers
    config.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    const startTime = performance.now();

    // Log the request
    logger.logApiRequest(config.method || 'GET', fullUrl, {
      component: 'ApiClient',
    });

    let lastError: AppError | undefined;
    let attempt = 0;

    while (attempt < retries) {
      try {
        let response = await this.executeWithTimeout(
          fetch(fullUrl, config),
          timeout
        );

        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          response = interceptor(response);
        }

        const duration = performance.now() - startTime;
        logger.logApiResponse(
          config.method || 'GET',
          fullUrl,
          response.status,
          duration,
          { component: 'ApiClient' }
        );

        const result = await this.handleResponse<T>(response);

        if (result.error && result.error.retryable && attempt < retries - 1) {
          lastError = result.error;
          const delay = result.error.retryAfter || retryDelay * Math.pow(2, attempt);
          logger.info(`Retrying API request after ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }

        return result;
      } catch (error) {
        lastError = errorHandler.handleError(error as Error, {
          category: ErrorCategory.NETWORK,
          retryable: true,
        });

        if (attempt < retries - 1) {
          const delay = retryDelay * Math.pow(2, attempt);
          logger.info(`Retrying API request after ${delay}ms due to error (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
        } else {
          const duration = performance.now() - startTime;
          logger.logApiResponse(
            config.method || 'GET',
            fullUrl,
            0,
            duration,
            { component: 'ApiClient', metadata: { error: lastError.message } }
          );
          return { error: lastError, status: 0, headers: new Headers() };
        }
      }
    }

    return { error: lastError, status: 0, headers: new Headers() };
  }

  // HTTP methods
  async get<T = any>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.executeRequest<T>(url, { ...options, method: 'GET' });
  }

  async post<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.executeRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.executeRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.executeRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.executeRequest<T>(url, { ...options, method: 'DELETE' });
  }

  // Utility method for handling API responses in components
  async handleApiCall<T>(
    apiCall: Promise<ApiResponse<T>>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: AppError) => void;
      showErrorToast?: boolean;
    }
  ): Promise<T | null> {
    try {
      const response = await apiCall;

      if (response.error) {
        if (options?.onError) {
          options.onError(response.error);
        }
        if (options?.showErrorToast) {
          // TODO: Integrate with toast notification system
          console.error('API Error:', response.error.userMessage);
        }
        return null;
      }

      if (response.data && options?.onSuccess) {
        options.onSuccess(response.data);
      }

      return response.data || null;
    } catch (error) {
      const appError = errorHandler.handleError(error as Error);
      if (options?.onError) {
        options.onError(appError);
      }
      return null;
    }
  }
}

export const apiClient = ApiClient.getInstance();
export default apiClient;