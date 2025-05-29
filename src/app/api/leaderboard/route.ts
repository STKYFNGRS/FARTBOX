import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

// Force dynamic rendering since we use request.url
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    
    if (gameId) {
      // Game-specific leaderboard (current game players ranked by territories)
      const gameLeaderboard = await query(`
        SELECT 
          p.id,
          p.username,
          COALESCE(p.username, CONCAT('Player ', p.id)) as display_name,
          SUBSTRING(p.wallet_address, 1, 6) || '...' || SUBSTRING(p.wallet_address, -4) as short_address,
          pgs.territories_count,
          pgs.gas_units,
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
      
      return NextResponse.json({ 
        type: 'game',
        gameId,
        players: gameLeaderboard.rows 
      });
    } else {
      // Global leaderboard (top players by wins and XP)
      const globalLeaderboard = await query(`
        SELECT 
          p.id,
          p.username,
          COALESCE(p.username, CONCAT('Player ', p.id)) as display_name,
          SUBSTRING(p.wallet_address, 1, 6) || '...' || SUBSTRING(p.wallet_address, -4) as short_address,
          COUNT(mr.id) as total_games,
          SUM(CASE WHEN mr.placement = 1 THEN 1 ELSE 0 END) as wins,
          SUM(mr.xp_earned) as total_xp,
          SUM(mr.tokens_earned) as total_tokens,
          CASE 
            WHEN COUNT(mr.id) > 0 
            THEN CAST((SUM(CASE WHEN mr.placement = 1 THEN 1 ELSE 0 END)::float / COUNT(mr.id) * 100) AS DECIMAL(5,1))
            ELSE 0 
          END as win_rate
        FROM 
          players p
        LEFT JOIN 
          match_results mr ON p.id = mr.player_id
        WHERE 
          p.is_bot = false
        GROUP BY 
          p.id, p.username, p.wallet_address
        HAVING 
          COUNT(mr.id) > 0
        ORDER BY 
          wins DESC, 
          total_xp DESC,
          win_rate DESC
        LIMIT 10
      `);
      
      return NextResponse.json({ 
        type: 'global',
        players: globalLeaderboard.rows 
      });
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
} 