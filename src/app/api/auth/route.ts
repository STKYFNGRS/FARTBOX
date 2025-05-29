import { NextRequest, NextResponse } from 'next/server';
import { query, ensureTablesExist } from '../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Ensure all database tables exist first
    await ensureTablesExist();
    
    const { walletAddress } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if player exists
    const existingPlayer = await query(`
      SELECT id, username FROM players WHERE wallet_address = $1
    `, [walletAddress]);

    let player;
    if (existingPlayer.rowCount > 0) {
      // Update last active time
      await query(`
        UPDATE players SET last_active = CURRENT_TIMESTAMP WHERE wallet_address = $1
      `, [walletAddress]);
      
      player = existingPlayer.rows[0];
    } else {
      // Create new player
      const newPlayer = await query(`
        INSERT INTO players (wallet_address, last_active) 
        VALUES ($1, CURRENT_TIMESTAMP) 
        RETURNING id, username
      `, [walletAddress]);
      
      player = newPlayer.rows[0];
    }

    return NextResponse.json({
      success: true,
      player: {
        id: player.id,
        username: player.username || `Player ${player.id}`
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 