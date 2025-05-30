import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Get online users (active in last 10 minutes)
export async function GET() {
  try {
    const onlineUsers = await sql`
      SELECT 
        id, 
        wallet_address, 
        username,
        ens_name,
        ens_avatar,
        last_active
      FROM players 
      WHERE last_active > NOW() - INTERVAL '10 minutes'
      ORDER BY last_active DESC
    `;

    return NextResponse.json(onlineUsers);
  } catch (error) {
    console.error('Error fetching online users:', error);
    return NextResponse.json({ error: 'Failed to fetch online users' }, { status: 500 });
  }
} 