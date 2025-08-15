import DOMPurify from 'dompurify';

// XSS Prevention
export const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'span', 'div'],
    ALLOWED_ATTR: ['class', 'id'],
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false
  });
};

// Sanitize for plain text (removes all HTML)
export const sanitizeText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

// CSRF Token Management
class CSRFTokenManager {
  private static instance: CSRFTokenManager;
  private token: string | null = null;
  private readonly storageKey = 'csrf_token';
  
  private constructor() {
    this.initToken();
  }
  
  static getInstance(): CSRFTokenManager {
    if (!CSRFTokenManager.instance) {
      CSRFTokenManager.instance = new CSRFTokenManager();
    }
    return CSRFTokenManager.instance;
  }
  
  private initToken(): void {
    // Try to get existing token from sessionStorage
    const stored = sessionStorage.getItem(this.storageKey);
    if (stored) {
      this.token = stored;
    } else {
      this.generateToken();
    }
  }
  
  generateToken(): string {
    this.token = this.generateSecureToken();
    sessionStorage.setItem(this.storageKey, this.token);
    return this.token;
  }
  
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  getToken(): string {
    if (!this.token) {
      this.generateToken();
    }
    return this.token!;
  }
  
  validateToken(token: string): boolean {
    return token === this.token;
  }
  
  clearToken(): void {
    this.token = null;
    sessionStorage.removeItem(this.storageKey);
  }
}

export const CSRFToken = CSRFTokenManager.getInstance();

// Rate Limiting
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  check(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(timestamp => now - timestamp < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false; // Rate limit exceeded
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    // Cleanup old keys periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }
    
    return true;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, attempts] of this.attempts.entries()) {
      const recentAttempts = attempts.filter(t => now - t < this.windowMs);
      if (recentAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, recentAttempts);
      }
    }
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
  
  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const recentAttempts = attempts.filter(t => now - t < this.windowMs);
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }
}

// API Rate Limiter instance
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

// Login Rate Limiter instance (stricter)
export const loginRateLimiter = new RateLimiter(5, 300000); // 5 attempts per 5 minutes

// Input Validation Helpers
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/,
  invoiceNumber: /^INV-\d{6,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

export const validateInput = (value: string, pattern: RegExp): boolean => {
  return pattern.test(value);
};

// Secure Headers Helper
export const getSecureHeaders = (includeCSRF: boolean = true): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  
  if (includeCSRF) {
    headers['X-CSRF-Token'] = CSRFToken.getToken();
  }
  
  return headers;
};

// Password Strength Checker
export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters');
  
  if (password.length >= 12) score += 1;
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters');
  
  return { score: Math.min(score, 5), feedback };
};

// SQL Injection Prevention (parameter binding helper)
export const sanitizeSQLParam = (value: any): any => {
  if (typeof value === 'string') {
    // Remove potential SQL injection patterns
    return value.replace(/['";\\]/g, '');
  }
  return value;
};

// File Upload Security
export const validateFileUpload = (file: File, options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
} = {}): { valid: boolean; error?: string } => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.csv']
  } = options;
  
  // Check file size
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size exceeds ${(maxSize / (1024 * 1024)).toFixed(2)}MB limit` 
    };
  }
  
  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type ${file.type} is not allowed` 
    };
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  
  if (allowedExtensions.length > 0 && !hasValidExtension) {
    return { 
      valid: false, 
      error: `File extension not allowed. Allowed: ${allowedExtensions.join(', ')}` 
    };
  }
  
  return { valid: true };
};

// Session Timeout Manager
export class SessionTimeoutManager {
  private timeout: NodeJS.Timeout | null = null;
  private warningTimeout: NodeJS.Timeout | null = null;
  
  constructor(
    private timeoutMs: number = 30 * 60 * 1000, // 30 minutes
    private warningMs: number = 5 * 60 * 1000, // 5 minutes before timeout
    private onTimeout: () => void,
    private onWarning?: () => void
  ) {}
  
  start(): void {
    this.reset();
  }
  
  reset(): void {
    this.clear();
    
    // Set warning timeout
    if (this.onWarning) {
      this.warningTimeout = setTimeout(() => {
        this.onWarning!();
      }, this.timeoutMs - this.warningMs);
    }
    
    // Set session timeout
    this.timeout = setTimeout(() => {
      this.onTimeout();
    }, this.timeoutMs);
  }
  
  clear(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }
  
  extend(): void {
    this.reset();
  }
}