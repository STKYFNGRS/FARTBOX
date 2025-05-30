import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Get online users (active in last 10 minutes)
export async function GET(request: NextRequest) {
  try {
    // Get users who have been active in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const result = await sql`
      SELECT DISTINCT 
        p.id,
        p.wallet_address,
        p.username,
        p.ens_name,
        p.ens_avatar,
        p.last_active
      FROM players p
      WHERE p.last_active > ${tenMinutesAgo.toISOString()}
      ORDER BY p.last_active DESC
    `;

    // Return stored ENS data as fallback, frontend will do live resolution like ethereum-identity-kit
    const onlineUsers = result.map(user => ({
      id: user.id,
      wallet_address: user.wallet_address,
      username: user.username,
      ens_name: user.ens_name, // Stored fallback data
      ens_avatar: user.ens_avatar, // Stored fallback data
      last_active: user.last_active,
    }));

    return NextResponse.json(onlineUsers, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch online users' }, 
      { status: 500 }
    );
  }
} 