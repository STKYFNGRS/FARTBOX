import { NextRequest, NextResponse } from 'next/server';
import { query, getAdjacentCoords, GameInstance, Player, GameTile } from '../../../../lib/db';
import { startGame } from '../../../../lib/game-utils';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Get specific game details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    
    // Get game details
    const gameResult = await query<GameInstance>(`
      SELECT 
        gi.*, 
        gs.season_id 
      FROM 
        game_instances gi 
      JOIN 
        game_sessions gs ON gi.game_session_id = gs.id 
      WHERE 
        gi.id = $1
    `, [gameId]);
    
    if (gameResult.rows?.length === 0) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    // Get players in the game
    const playersResult = await query<Player & {gas_units: number, territories_count: number}>(`
      SELECT 
        p.id, 
        p.username, 
        p.wallet_address,
        pgs.gas_units, 
        pgs.territories_count
      FROM 
        player_game_states pgs
      JOIN 
        players p ON pgs.player_id = p.id
      WHERE 
        pgs.game_instance_id = $1
    `, [gameId]);
    
    // Get game territories
    const territoryResult = await query<GameTile>(`
      SELECT 
        id, 
        x_coord, 
        y_coord, 
        owner_id, 
        gas_type,
        defense_bonus,
        is_gas_vent
      FROM 
        game_tiles
      WHERE 
        game_instance_id = $1
    `, [gameId]);
    
    return NextResponse.json({
      game: gameResult.rows[0],
      players: playersResult.rows || [],
      territories: territoryResult.rows || []
    });
  } catch (error) {
    console.error('Error fetching game details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game details' },
      { status: 500 }
    );
  }
}

// Join a game
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    const body = await request.json();
    const { playerId } = body;
    
    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }
    
    // Check if game exists and get its current state
    const gameResult = await query<GameInstance & {player_count: string}>(`
      SELECT 
        status,
        (
          SELECT COUNT(*) 
          FROM player_game_states 
          WHERE game_instance_id = id
        ) as player_count
      FROM 
        game_instances 
      WHERE 
        id = $1
    `, [gameId]);
    
    if (gameResult.rows?.length === 0) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const game = gameResult.rows[0];
    
    // Check if player is already in the game
    const playerCheck = await query(`
      SELECT id FROM player_game_states 
      WHERE game_instance_id = $1 AND player_id = $2
    `, [gameId, playerId]);
    
    if (playerCheck.rows?.length > 0) {
      // Player is already in the game - allow them to rejoin
      return NextResponse.json({
        success: true,
        message: 'Rejoined game successfully',
        gameStarted: game.status === 'active',
        alreadyInGame: true
      });
    }
    
    // For new players joining
    if (game.status !== 'pending') {
      return NextResponse.json(
        { error: 'Game is not accepting new players' },
        { status: 400 }
      );
    }
    
    if (parseInt(game.player_count) >= 6) {
      return NextResponse.json(
        { error: 'Game is already full' },
        { status: 400 }
      );
    }
    
    // Add new player to game
    await query(`
      INSERT INTO player_game_states 
        (game_instance_id, player_id, gas_units, territories_count) 
      VALUES 
        ($1, $2, $3, $4)
    `, [gameId, playerId, 100, 0]);
    
    // Check if game is now full (6 players) and should start
    const updatedCount = await query<{count: string}>(`
      SELECT COUNT(*) as count
      FROM player_game_states 
      WHERE game_instance_id = $1
    `, [gameId]);
    
    const playerCount = parseInt(updatedCount.rows[0].count);
    
    if (playerCount >= 6) {
      // Start the game by initializing the map
      await startGame(parseInt(gameId));
      
      return NextResponse.json({
        success: true,
        message: 'Joined game successfully. Game is starting!',
        gameStarted: true
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Joined game successfully',
      gameStarted: false
    });
  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json(
      { error: 'Failed to join game' },
      { status: 500 }
    );
  }
}

// Helper function to start a game has been moved to lib/game-utils.ts 