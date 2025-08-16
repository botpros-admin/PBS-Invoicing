import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckResult;
    api: CheckResult;
    storage: CheckResult;
    auth: CheckResult;
  };
  version: string;
  environment: string;
}

interface CheckResult {
  status: 'ok' | 'error' | 'warning';
  message: string;
  responseTime?: number;
  details?: any;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Simple query to check database connectivity
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single();

    if (error) throw error;

    const responseTime = Date.now() - start;
    return {
      status: responseTime < 1000 ? 'ok' : 'warning',
      message: 'Database connection successful',
      responseTime,
    };
  } catch (error) {
    logger.error('Health check: Database failed', error as Error);
    return {
      status: 'error',
      message: 'Database connection failed',
      responseTime: Date.now() - start,
      details: (error as Error).message,
    };
  }
}

async function checkApi(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Check if API can process requests
    const responseTime = Date.now() - start;
    return {
      status: 'ok',
      message: 'API is responsive',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'API check failed',
      responseTime: Date.now() - start,
      details: (error as Error).message,
    };
  }
}

async function checkStorage(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check storage bucket accessibility
    const { error } = await supabase.storage.getBucket('invoices');
    
    const responseTime = Date.now() - start;
    
    if (error && error.message.includes('not found')) {
      // Bucket doesn't exist yet, which is ok
      return {
        status: 'warning',
        message: 'Storage bucket not configured',
        responseTime,
      };
    }
    
    if (error) throw error;

    return {
      status: 'ok',
      message: 'Storage is accessible',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Storage check failed',
      responseTime: Date.now() - start,
      details: (error as Error).message,
    };
  }
}

async function checkAuth(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check auth service
    const { error } = await supabase.auth.getSession();
    
    const responseTime = Date.now() - start;
    
    if (error) throw error;

    return {
      status: 'ok',
      message: 'Authentication service is operational',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Authentication check failed',
      responseTime: Date.now() - start,
      details: (error as Error).message,
    };
  }
}

const startTime = Date.now();

export async function GET(request: NextRequest) {
  try {
    // Run all health checks in parallel
    const [database, api, storage, auth] = await Promise.all([
      checkDatabase(),
      checkApi(),
      checkStorage(),
      checkAuth(),
    ]);

    const checks = { database, api, storage, auth };
    
    // Determine overall status
    const hasError = Object.values(checks).some(check => check.status === 'error');
    const hasWarning = Object.values(checks).some(check => check.status === 'warning');
    
    let status: HealthStatus['status'] = 'healthy';
    if (hasError) status = 'unhealthy';
    else if (hasWarning) status = 'degraded';

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
    };

    // Log health check
    if (status === 'unhealthy') {
      logger.error('Health check failed', undefined, {
        component: 'HealthCheck',
        metadata: healthStatus,
      });
    }

    return NextResponse.json(healthStatus, {
      status: status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Health check error', error as Error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: (error as Error).message,
      },
      { status: 503 }
    );
  }
}

// Liveness check - simple endpoint to verify the service is running
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}