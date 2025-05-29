import { NextRequest, NextResponse } from 'next/server';
import { ensureTablesExist } from '../../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Initialize database tables
export async function POST(request: NextRequest) {
  try {
    await ensureTablesExist();
    
    return NextResponse.json({
      success: true,
      message: 'Database tables initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
} 