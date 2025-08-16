/**
 * Security Configuration
 * Centralized security settings for the PBS Invoicing application
 */

export const SecurityConfig = {
  // CORS Settings
  cors: {
    allowedOrigins: process.env.NODE_ENV === 'production'
      ? [
          'https://pbs-invoicing.com', // Replace with your actual domain
          'https://app.pbs-invoicing.com',
        ]
      : ['http://localhost:5174', 'http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // Max 100 requests per minute per user
    skipSuccessfulRequests: false,
    message: 'Too many requests, please try again later.',
  },

  // Session Configuration
  session: {
    timeout: 30 * 60 * 1000, // 30 minutes
    refreshThreshold: 5 * 60 * 1000, // Refresh when 5 minutes remain
    maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Password Policy
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 5, // Prevent reuse of last 5 passwords
    maxAge: 90, // Days before password expiry
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: [
        "'self'",
        'https://*.supabase.co',
        'wss://*.supabase.co',
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },

  // Input Validation Rules
  validation: {
    email: {
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      maxLength: 255,
    },
    phone: {
      pattern: /^[\d\s\-\(\)\+]+$/,
      minLength: 10,
      maxLength: 20,
    },
    zipCode: {
      pattern: /^\d{5}(-\d{4})?$/,
    },
    amount: {
      min: 0,
      max: 999999999.99,
      precision: 2,
    },
    invoiceNumber: {
      pattern: /^[A-Z0-9\-]+$/,
      maxLength: 50,
    },
    taxId: {
      pattern: /^\d{2}-\d{7}$/,
    },
  },

  // File Upload Restrictions
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.csv', '.xls', '.xlsx'],
  },

  // API Security
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Audit Logging
  audit: {
    enabled: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    sensitiveFields: [
      'password',
      'ssn',
      'taxId',
      'creditCard',
      'bankAccount',
      'apiKey',
      'token',
    ],
  },

  // Security Headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  },
};

/**
 * Password validation utility
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const policy = SecurityConfig.passwordPolicy;

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Input validation utility
 */
export function validateInput(
  value: string,
  type: keyof typeof SecurityConfig.validation
): boolean {
  const rule = SecurityConfig.validation[type];
  
  if ('pattern' in rule && rule.pattern) {
    if (!rule.pattern.test(value)) {
      return false;
    }
  }
  
  if ('maxLength' in rule && rule.maxLength) {
    if (value.length > rule.maxLength) {
      return false;
    }
  }
  
  if ('minLength' in rule && rule.minLength) {
    if (value.length < rule.minLength) {
      return false;
    }
  }
  
  return true;
}

/**
 * File validation utility
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
  const config = SecurityConfig.fileUpload;

  // Check file size
  if (file.size > config.maxSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${config.maxSize / (1024 * 1024)}MB`,
    };
  }

  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not allowed',
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!config.allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: 'File extension not allowed',
    };
  }

  return { isValid: true };
}

export default SecurityConfig;