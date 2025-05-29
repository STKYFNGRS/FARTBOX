import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Get online users (active in last 5 minutes)
export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT 
        p.id,
        p.username,
        p.wallet_address,
        p.is_bot,
        p.last_active
      FROM players p
      WHERE p.last_active > NOW() - INTERVAL '5 minutes'
      ORDER BY p.last_active DESC
      LIMIT 50
    `);
    
    return NextResponse.json({
      success: true,
      users: result.rows.map(user => ({
        ...user,
        lastSeen: user.last_active
      }))
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch online users' },
      { status: 500 }
    );
  }
} 