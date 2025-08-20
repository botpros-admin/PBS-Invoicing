import { apiRateLimiter } from './security';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly cacheTime: number;
  
  constructor(cacheTimeMs: number = 5000) {
    this.cacheTime = cacheTimeMs;
    
    // Cleanup old requests periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }
  
  private generateKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.cacheTime) {
        this.pendingRequests.delete(key);
      }
    }
  }
  
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const key = this.generateKey(url, options);
    
    // Check for pending request
    const pending = this.pendingRequests.get(key);
    if (pending && Date.now() - pending.timestamp < this.cacheTime) {
      return pending.promise;
    }
    
    // Check rate limit
    const rateLimitKey = new URL(url).hostname;
    if (!apiRateLimiter.check(rateLimitKey)) {
      throw new Error(`Rate limit exceeded for ${rateLimitKey}`);
    }
    
    // Create new request
    const promise = fetch(url, options);
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });
    
    // Clean up after request completes
    promise.finally(() => {
      setTimeout(() => {
        this.pendingRequests.delete(key);
      }, this.cacheTime);
    });
    
    return promise;
  }
  
  clear(): void {
    this.pendingRequests.clear();
  }
}

// Create singleton instance
export const requestDeduplicator = new RequestDeduplicator();

// Enhanced fetch with deduplication and rate limiting
export const enhancedFetch = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  return requestDeduplicator.fetch(url, options);
};

// Query cache for GET requests
interface CacheEntry {
  data: any;
  timestamp: number;
  etag?: string;
}

class QueryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL: number;
  
  constructor(defaultTTLMs: number = 60000) { // 1 minute default
    this.defaultTTL = defaultTTLMs;
    
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 300000); // Every 5 minutes
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.defaultTTL * 2) {
        this.cache.delete(key);
      }
    }
  }
  
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }
    
    const data = await fetcher();
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    // Invalidate keys matching pattern
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

export const queryCache = new QueryCache();

// React Query-like hook for data fetching with deduplication
import { useState, useEffect, useRef } from 'react';

interface UseQueryOptions<T> {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
}

export function useDeduplicatedQuery<T>(
  key: string | string[],
  fetcher: () => Promise<T>,
  options: UseQueryOptions<T> = {}
): UseQueryResult<T> {
  const {
    enabled = true,
    refetchInterval,
    staleTime = 60000,
    cacheTime = 300000,
    onSuccess,
    onError
  } = options;
  
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const queryKey = Array.isArray(key) ? key.join(':') : key;
  
  const fetchData = async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await queryCache.get(
        queryKey,
        fetcher,
        staleTime
      );
      
      if (isMountedRef.current) {
        setData(result);
        onSuccess?.(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };
  
  useEffect(() => {
    isMountedRef.current = true;
    
    if (enabled) {
      fetchData();
      
      if (refetchInterval) {
        intervalRef.current = setInterval(fetchData, refetchInterval);
      }
    }
    
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryKey, enabled]);
  
  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== undefined && error === null,
    refetch: fetchData
  };
}

// Batch requests utility
interface BatchRequest<T> {
  key: string;
  resolver: (result: T) => void;
  rejecter: (error: Error) => void;
}

class BatchProcessor<T> {
  private batch: BatchRequest<T>[] = [];
  private timeout: NodeJS.Timeout | null = null;
  
  constructor(
    private batchFn: (keys: string[]) => Promise<Map<string, T>>,
    private delay: number = 10
  ) {}
  
  async get(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batch.push({
        key,
        resolver: resolve,
        rejecter: reject
      });
      
      if (!this.timeout) {
        this.timeout = setTimeout(() => this.processBatch(), this.delay);
      }
    });
  }
  
  private async processBatch(): Promise<void> {
    const currentBatch = [...this.batch];
    this.batch = [];
    this.timeout = null;
    
    if (currentBatch.length === 0) return;
    
    try {
      const keys = currentBatch.map(req => req.key);
      const results = await this.batchFn(keys);
      
      for (const request of currentBatch) {
        const result = results.get(request.key);
        if (result !== undefined) {
          request.resolver(result);
        } else {
          request.rejecter(new Error(`No result for key: ${request.key}`));
        }
      }
    } catch (error) {
      for (const request of currentBatch) {
        request.rejecter(error as Error);
      }
    }
  }
}

// Export batch processor factory
export function createBatchProcessor<T>(
  batchFn: (keys: string[]) => Promise<Map<string, T>>,
  delay: number = 10
): BatchProcessor<T> {
  return new BatchProcessor(batchFn, delay);
}

// Optimistic update helper
export function optimisticUpdate<T>(
  currentData: T,
  update: Partial<T>,
  rollbackFn?: (error: Error) => void
): { 
  optimisticData: T; 
  commit: () => void; 
  rollback: (error?: Error) => void 
} {
  const optimisticData = { ...currentData, ...update, _optimistic: true };
  let committed = false;
  
  return {
    optimisticData,
    commit: () => {
      committed = true;
      // Remove optimistic flag
      delete (optimisticData as any)._optimistic;
    },
    rollback: (error?: Error) => {
      if (!committed && rollbackFn && error) {
        rollbackFn(error);
      }
    }
  };
}