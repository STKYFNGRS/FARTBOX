import { NextRequest, NextResponse } from 'next/server';
import { query, Player } from '../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // In a real app, verify the signature here
    // For now, we'll skip signature verification for simplicity
    
    // Check if player exists
    const existingPlayerResult = await query<Player>(
      'SELECT id, wallet_address, nft_token_id, username FROM players WHERE wallet_address = $1',
      [walletAddress]
    );
    
    const existingPlayer = existingPlayerResult?.rows?.[0];
    
    if (!existingPlayer) {
      // Create new player
      const newPlayerResult = await query<Player>(
        'INSERT INTO players (wallet_address, last_active) VALUES ($1, NOW()) RETURNING id, wallet_address',
        [walletAddress]
      );
      
      return NextResponse.json({
        player: newPlayerResult.rows[0],
        isNewPlayer: true
      });
    }
    
    // Update last active timestamp
    await query(
      'UPDATE players SET last_active = NOW() WHERE wallet_address = $1',
      [walletAddress]
    );
    
    return NextResponse.json({
      player: existingPlayer,
      isNewPlayer: false
    });
  } catch (error) {
    console.error('Error in auth endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 