/**
 * Centralized logging system for PBS Invoicing
 * Provides structured logging with different levels and transports
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  stack?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private constructor() {
    // Set log level based on environment
    if (process.env.NODE_ENV === 'development') {
      this.logLevel = LogLevel.DEBUG;
    } else if (process.env.NODE_ENV === 'test') {
      this.logLevel = LogLevel.ERROR;
    } else {
      this.logLevel = LogLevel.INFO;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(entry: LogEntry): string {
    const levelStr = LogLevel[entry.level];
    const contextStr = entry.context ? JSON.stringify(entry.context) : '';
    return `[${entry.timestamp}] [${levelStr}] ${entry.message} ${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (level > this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      stack: error?.stack,
    };

    // Store in memory (circular buffer)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const formattedMessage = this.formatMessage(entry);
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, error);
        this.sendToMonitoring(entry);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
    }

    // In production, send to external service
    if (process.env.NODE_ENV === 'production' && level <= LogLevel.WARN) {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    try {
      // TODO: Integrate with external logging service (e.g., Sentry, DataDog, CloudWatch)
      // For now, we'll store critical logs in Supabase
      if (entry.level === LogLevel.ERROR) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        await supabase.from('error_logs').insert({
          timestamp: entry.timestamp,
          level: LogLevel[entry.level],
          message: entry.message,
          context: entry.context,
          stack: entry.stack,
        });
      }
    } catch (err) {
      // Fail silently - don't let logging errors break the app
      console.error('Failed to send log to external service:', err);
    }
  }

  private sendToMonitoring(entry: LogEntry) {
    // Send error metrics to monitoring service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: entry.message,
        fatal: true,
      });
    }
  }

  // Public methods
  error(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  // Performance logging
  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.info(`Performance: ${label}`, {
        action: 'performance',
        metadata: { duration: `${duration.toFixed(2)}ms` },
      });
    };
  }

  // API logging
  logApiRequest(method: string, url: string, context?: LogContext) {
    this.info(`API Request: ${method} ${url}`, {
      ...context,
      action: 'api_request',
    });
  }

  logApiResponse(method: string, url: string, status: number, duration: number, context?: LogContext) {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `API Response: ${method} ${url} - ${status}`, {
      ...context,
      action: 'api_response',
      metadata: { status, duration: `${duration}ms` },
    });
  }

  // Database logging
  logDatabaseQuery(query: string, duration: number, context?: LogContext) {
    this.debug(`Database Query: ${query.substring(0, 100)}...`, {
      ...context,
      action: 'database_query',
      metadata: { duration: `${duration}ms` },
    });
  }

  // User action logging
  logUserAction(action: string, details?: any, context?: LogContext) {
    this.info(`User Action: ${action}`, {
      ...context,
      action: 'user_action',
      metadata: details,
    });
  }

  // Payment logging (critical for financial auditing)
  logPaymentAction(action: string, amount: number, paymentId: string, context?: LogContext) {
    this.info(`Payment Action: ${action}`, {
      ...context,
      action: 'payment',
      metadata: { amount, paymentId, action },
    });
  }

  // Get recent logs for debugging
  getRecentLogs(count = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs (useful for testing)
  clearLogs() {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();
export default logger;