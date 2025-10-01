import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';

export async function GET() {
  try {
    // Simple database connectivity check
    await db.select().from(users).limit(1);

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}