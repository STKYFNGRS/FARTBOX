import { NextRequest, NextResponse } from 'next/server';
import { query, ensureTablesExist } from '../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let walletAddress: string = '';
  
  try {
    // Try to ensure all database tables exist, but don't fail if database is having issues
    try {
      await ensureTablesExist();
    } catch (dbError) {
      console.warn('Database table creation failed - continuing with authentication:', dbError);
    }
    
    const body = await request.json();
    walletAddress = body.walletAddress;
    
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
    
    // If it's a database connection issue, provide a fallback response
    if (error instanceof Error && error.message.includes('Control plane request failed') && walletAddress) {
      console.warn('Database connection issues - providing fallback authentication');
      
      // Generate a temporary player ID based on wallet address
      const tempId = Math.abs(parseInt(walletAddress.slice(-8), 16)) % 10000;
      
      return NextResponse.json({
        success: true,
        player: {
          id: tempId,
          username: `Player ${tempId}`,
          temporary: true
        }
      });
    }
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 