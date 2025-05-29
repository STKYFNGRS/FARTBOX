import { NextRequest, NextResponse } from 'next/server';
import { ensureTablesExist } from '../../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Database initialization endpoint using Neon serverless Postgres
export async function POST(request: NextRequest) {
  try {
    console.log('[DB-INIT] Initializing Neon database schema...');

    // Use the proper Neon database initialization
    await ensureTablesExist();

    console.log('[DB-INIT] Database schema initialized successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Neon database schema initialized successfully' 
    });

  } catch (error: any) {
    console.error('[DB-INIT] Database initialization failed:', error.message);
    return NextResponse.json(
      { 
        error: 'Failed to initialize database schema',
        message: error.message 
      },
      { status: 500 }
    );
  }
} 