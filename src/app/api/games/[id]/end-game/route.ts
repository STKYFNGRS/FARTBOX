import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// End a game due to time expiration or other conditions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    const { reason } = await request.json();
    
    console.log(`Ending game ${gameId} due to: ${reason}`);
    
    // Get current game status
    const gameResult = await query(`
      SELECT status FROM game_instances WHERE id = $1
    `, [gameId]);
    
    if (gameResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    if (gameResult.rows[0].status !== 'active') {
      return NextResponse.json(
        { message: 'Game already completed' }
      );
    }
    
    // Get all players and their final standings
    const playersResult = await query(`
      SELECT 
        pgs.player_id,
        pgs.territories_count,
        p.username,
        p.is_bot
      FROM 
        player_game_states pgs
      JOIN 
        players p ON pgs.player_id = p.id
      WHERE 
        pgs.game_instance_id = $1
      ORDER BY 
        pgs.territories_count DESC,
        pgs.gas_units DESC
    `, [gameId]);
    
    const players = playersResult.rows;
    const winner = players[0]; // Player with most territories
    
    // Update game status to completed
    await query(`
      UPDATE game_instances 
      SET status = 'completed', end_time = NOW() 
      WHERE id = $1
    `, [gameId]);
    
    // Record match results for each player
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const placement = i + 1;
      
      // Calculate rewards based on placement
      let tokensEarned = 0;
      let xpEarned = 0;
      
      switch (placement) {
        case 1:
          tokensEarned = 50;
          xpEarned = 50;
          break;
        case 2:
          tokensEarned = 30;
          xpEarned = 30;
          break;
        case 3:
          tokensEarned = 15;
          xpEarned = 20;
          break;
        default:
          tokensEarned = 5;
          xpEarned = 10;
          break;
      }
      
      // Only record for human players
      if (!player.is_bot) {
        try {
          await query(`
            INSERT INTO match_results 
              (game_instance_id, player_id, placement, territories_final, tokens_earned, xp_earned) 
            VALUES 
              ($1, $2, $3, $4, $5, $6)
          `, [gameId, player.player_id, placement, player.territories_count, tokensEarned, xpEarned]);
        } catch (error) {
          console.error(`Error recording match result for player ${player.player_id}:`, error);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Game ended due to ${reason}`,
      winner: {
        id: winner.player_id,
        username: winner.username,
        territories: winner.territories_count,
        isBot: winner.is_bot
      },
      finalStandings: players.map((p, i) => ({
        placement: i + 1,
        playerId: p.player_id,
        username: p.username,
        territories: p.territories_count,
        isBot: p.is_bot
      }))
    });
    
  } catch (error) {
    console.error('Error ending game:', error);
    return NextResponse.json(
      { error: 'Failed to end game' },
      { status: 500 }
    );
  }
} 