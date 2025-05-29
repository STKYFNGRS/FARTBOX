import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

// Force dynamic rendering since we use request.url
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const playerId = searchParams.get('playerId');
    
    if (!walletAddress && !playerId) {
      return NextResponse.json(
        { error: 'Wallet address or player ID is required' },
        { status: 400 }
      );
    }
    
    // Get player basic info
    const playerQuery = playerId 
      ? 'SELECT * FROM players WHERE id = $1'
      : 'SELECT * FROM players WHERE wallet_address = $1';
    const playerParam = playerId || walletAddress;
    
    const playerResult = await query(playerQuery, [playerParam]);
    
    if (playerResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    const player = playerResult.rows[0];
    
    // Get player game statistics
    const statsResult = await query(`
      SELECT 
        COUNT(mr.id) as total_games,
        SUM(CASE WHEN mr.placement = 1 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN mr.placement <= 3 THEN 1 ELSE 0 END) as top_3_finishes,
        SUM(mr.tokens_earned) as total_tokens,
        SUM(mr.xp_earned) as total_xp,
        AVG(mr.territories_final) as avg_territories,
        MIN(mr.placement) as best_placement,
        CASE 
          WHEN COUNT(mr.id) > 0 
          THEN CAST((SUM(CASE WHEN mr.placement = 1 THEN 1 ELSE 0 END)::float / COUNT(mr.id) * 100) AS DECIMAL(5,1))
          ELSE 0 
        END as win_rate,
        CASE 
          WHEN COUNT(mr.id) > 0 
          THEN CAST((SUM(CASE WHEN mr.placement <= 3 THEN 1 ELSE 0 END)::float / COUNT(mr.id) * 100) AS DECIMAL(5,1))
          ELSE 0 
        END as top_3_rate
      FROM 
        match_results mr
      WHERE 
        mr.player_id = $1
    `, [player.id]);
    
    // Get recent games
    const recentGamesResult = await query(`
      SELECT 
        gi.id as game_id,
        gi.start_time,
        gi.end_time,
        mr.placement,
        mr.territories_final,
        mr.tokens_earned,
        mr.xp_earned,
        gi.status
      FROM 
        match_results mr
      JOIN 
        game_instances gi ON mr.game_instance_id = gi.id
      WHERE 
        mr.player_id = $1
      ORDER BY 
        gi.end_time DESC
      LIMIT 5
    `, [player.id]);
    
    // Get current active games
    const activeGamesResult = await query(`
      SELECT 
        gi.id as game_id,
        gi.start_time,
        gi.status,
        pgs.gas_units,
        pgs.territories_count
      FROM 
        player_game_states pgs
      JOIN 
        game_instances gi ON pgs.game_instance_id = gi.id
      WHERE 
        pgs.player_id = $1 AND 
        gi.status IN ('pending', 'active')
      ORDER BY 
        gi.start_time DESC
    `, [player.id]);
    
    // Calculate level based on XP (simple formula: level = floor(xp / 100) + 1)
    const totalXp = statsResult.rows[0]?.total_xp || 0;
    const level = Math.floor(totalXp / 100) + 1;
    const xpToNextLevel = ((level * 100) - totalXp);
    const xpProgress = totalXp % 100;
    
    // Determine achievements
    const achievements = [];
    const stats = statsResult.rows[0];
    
    if (stats.wins >= 1) achievements.push({ name: 'First Victory', icon: '🏆', description: 'Win your first game' });
    if (stats.wins >= 5) achievements.push({ name: 'Gas Champion', icon: '👑', description: 'Win 5 games' });
    if (stats.wins >= 10) achievements.push({ name: 'Fart Master', icon: '💨', description: 'Win 10 games' });
    if (stats.win_rate >= 50) achievements.push({ name: 'Dominant Force', icon: '⚡', description: 'Maintain 50%+ win rate' });
    if (stats.total_games >= 10) achievements.push({ name: 'Veteran Player', icon: '🎖️', description: 'Play 10+ games' });
    if (stats.best_placement === 1 && stats.total_games === 1) achievements.push({ name: 'Beginner\'s Luck', icon: '🍀', description: 'Win your very first game' });
    
    return NextResponse.json({
      player: {
        id: player.id,
        username: player.username,
        walletAddress: player.wallet_address,
        nftTokenId: player.nft_token_id,
        lastActive: player.last_active,
        isBot: player.is_bot
      },
      stats: {
        level,
        totalXp,
        xpToNextLevel,
        xpProgress,
        totalGames: parseInt(stats.total_games) || 0,
        wins: parseInt(stats.wins) || 0,
        top3Finishes: parseInt(stats.top_3_finishes) || 0,
        totalTokens: parseInt(stats.total_tokens) || 0,
        avgTerritories: parseFloat(stats.avg_territories) || 0,
        bestPlacement: parseInt(stats.best_placement) || 0,
        winRate: parseFloat(stats.win_rate) || 0,
        top3Rate: parseFloat(stats.top_3_rate) || 0
      },
      achievements,
      recentGames: recentGamesResult.rows,
      activeGames: activeGamesResult.rows
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    );
  }
} 