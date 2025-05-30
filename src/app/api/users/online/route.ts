import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Simple ENS resolution cache to avoid repeated requests
const ensCache = new Map<string, { name?: string; avatar?: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function resolveENSName(address: string): Promise<{ name?: string; avatar?: string }> {
  try {
    // Check cache first
    const cached = ensCache.get(address);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return { name: cached.name, avatar: cached.avatar };
    }

    // Simple fallback: try to get from database stored values
    // In production, you could implement server-side ENS resolution here
    // For now, return empty to avoid CCIP-v2 errors
    const result = { name: undefined, avatar: undefined };
    
    // Cache the result
    ensCache.set(address, { ...result, timestamp: Date.now() });
    
    return result;
  } catch (error) {
    console.error('ENS resolution error:', error);
    return { name: undefined, avatar: undefined };
  }
}

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Get online users (active in last 10 minutes)
export async function GET(request: NextRequest) {
  try {
    // Get users who have been active in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const result = await sql`
      SELECT DISTINCT 
        u.id,
        u.wallet_address,
        u.username,
        u.ens_name,
        u.ens_avatar,
        u.last_active
      FROM users u
      WHERE u.last_active > ${tenMinutesAgo.toISOString()}
      ORDER BY u.last_active DESC
    `;

    // For production stability, use stored ENS data only
    // You can implement background ENS updates separately
    const onlineUsers = result.map(user => ({
      id: user.id,
      wallet_address: user.wallet_address,
      username: user.username,
      ens_name: user.ens_name, // Use stored data
      ens_avatar: user.ens_avatar, // Use stored data
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