/**
 * Health Check API
 * Used for monitoring and load balancer health checks
 */

import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connection
    const dbHealthy = await testConnection();

    const responseTime = Date.now() - startTime;

    if (!dbHealthy) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`,
          checks: {
            database: 'unhealthy',
            application: 'healthy',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: process.env.npm_package_version || '2.0.2',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: 'healthy',
        application: 'healthy',
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        error: 'Health check failed',
        checks: {
          database: 'unknown',
          application: 'unhealthy',
        },
      },
      { status: 503 }
    );
  }
}
