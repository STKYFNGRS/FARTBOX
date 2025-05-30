import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, username, ensName, ensAvatar } = await request.json();
    
    console.log('📝 Updating user with data:', { walletAddress, username, ensName, ensAvatar });

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Update or insert player with ENS data
    const result = await sql`
      INSERT INTO players (wallet_address, username, ens_name, ens_avatar, last_active)
      VALUES (${walletAddress}, ${username || null}, ${ensName || null}, ${ensAvatar || null}, NOW())
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        username = COALESCE(${username || null}, players.username),
        ens_name = COALESCE(${ensName || null}, players.ens_name),
        ens_avatar = COALESCE(${ensAvatar || null}, players.ens_avatar),
        last_active = NOW()
      RETURNING id, wallet_address, username, ens_name, ens_avatar
    `;

    console.log('✅ User update result:', result[0]);

    return NextResponse.json({ 
      success: true, 
      player: result[0]
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
} 