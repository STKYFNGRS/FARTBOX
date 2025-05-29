import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { query } from '../../../../lib/db';
import { processBotActions } from '../../games/[id]/actions/ai-bot';

// Force dynamic rendering since we use headers
export const dynamic = 'force-dynamic';

// This route should be called by a cron job scheduler
// With a setup like Vercel Cron Jobs or a similar service
export async function GET(request: NextRequest) {
  try {
    // Verify authentication token if this is a protected route
    const token = request.headers.get('x-cron-token');
    const expectedToken = process.env.CRON_SECRET;
    
    // In production, you should validate the token to prevent unauthorized access
    if (process.env.NODE_ENV === 'production' && token !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find all active games with bots
    const activeGamesResult = await query<{id: number, has_bots: boolean}>(`
      SELECT DISTINCT
        gi.id,
        (
          EXISTS (
            SELECT 1 
            FROM player_game_states pgs
            JOIN players p ON pgs.player_id = p.id
            WHERE pgs.game_instance_id = gi.id AND p.is_bot = true
          )
        ) as has_bots
      FROM 
        game_instances gi
      WHERE 
        gi.status = 'active'
    `);
    
    const gamesWithBots = activeGamesResult.rows.filter(game => game.has_bots);
    
    // Process bot actions for each game
    const results = [];
    for (const game of gamesWithBots) {
      const result = await processBotActions(game.id);
      results.push({
        gameId: game.id,
        success: result
      });
    }
    
    return NextResponse.json({ 
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Error processing bot actions:', error);
    return NextResponse.json(
      { error: 'Failed to process bot actions' },
      { status: 500 }
    );
  }
} 