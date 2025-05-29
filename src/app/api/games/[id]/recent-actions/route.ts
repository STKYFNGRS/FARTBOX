import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Get recent actions for a game using Neon database
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    
    if (!gameId || isNaN(parseInt(gameId))) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Fetching recent actions for game ${gameId}`);
    
    // Query recent actions using Neon database
    // Using created_at column and limiting to actions from the last hour
    const actionsResult = await query(`
      SELECT 
        pa.player_id,
        pa.action_type,
        pa.target_x,
        pa.target_y,
        pa.gas_spent,
        pa.result,
        pa.created_at,
        p.username,
        p.is_bot
      FROM player_actions pa
      INNER JOIN players p ON pa.player_id = p.id
      WHERE pa.game_instance_id = $1 
        AND pa.created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY pa.created_at DESC
      LIMIT 10
    `, [gameId]);
    
    console.log(`[API] Found ${actionsResult.rowCount} recent actions for game ${gameId}`);
    
    return NextResponse.json({
      actions: actionsResult.rows,
      count: actionsResult.rowCount
    });
    
  } catch (error: any) {
    console.error(`[API] Error fetching recent actions for game ${params.id}:`, error.message);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch recent actions',
        message: error.message 
      },
      { status: 500 }
    );
  }
} 