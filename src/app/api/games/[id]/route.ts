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
    
    console.log(`[API] Fetching game data for: ${gameId}`);
    
    // Get game information
    const gameResult = await query<GameInstance>(`
      SELECT 
        gi.*,
        gs.season_id
      FROM 
        game_instances gi
      LEFT JOIN 
        game_sessions gs ON gi.game_session_id = gs.id
      WHERE 
        gi.id = $1
    `, [gameId]);
    
    if (gameResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const game = gameResult.rows[0];
    
    // Apply passive gas regeneration for active games
    if (game.status === 'active') {
      await applyPassiveGasRegeneration(parseInt(gameId));
    }
    
    // Get players in the game with their states
    const playersResult = await query(`
      SELECT 
        p.id,
        p.username,
        p.wallet_address,
        p.is_bot,
        pgs.gas_units,
        pgs.last_action_time,
        pgs.territories_count
      FROM 
        players p
      INNER JOIN 
        player_game_states pgs ON p.id = pgs.player_id
      WHERE 
        pgs.game_instance_id = $1
      ORDER BY 
        pgs.territories_count DESC, pgs.gas_units DESC
    `, [gameId]);
    
    // Get territories
    const territoriesResult = await query<GameTile>(`
      SELECT 
        id,
        x_coord, 
        y_coord, 
        owner_id, 
        gas_type, 
        defense_bonus, 
        defense_bonus_until,
        is_gas_vent
      FROM 
        game_tiles 
      WHERE 
        game_instance_id = $1
      ORDER BY 
        y_coord, x_coord
    `, [gameId]);
    
    return NextResponse.json({
      success: true,
      game,
      players: playersResult.rows,
      territories: territoriesResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game data' },
      { status: 500 }
    );
  }
}

// Helper function for passive gas regeneration
async function applyPassiveGasRegeneration(gameId: number) {
  try {
    console.log(`[GAS-REGEN] Applying passive gas regeneration for game ${gameId}`);
    
    // Get all players in the game with their last regen time
    const playersResult = await query(`
      SELECT 
        pgs.player_id,
        pgs.gas_units,
        pgs.last_action_time,
        COALESCE(pgs.last_gas_regen, pgs.last_action_time, NOW() - INTERVAL '2 minutes') as last_regen
      FROM 
        player_game_states pgs
      WHERE 
        pgs.game_instance_id = $1
    `, [gameId]);
    
    const now = new Date();
    
    for (const player of playersResult.rows) {
      const lastRegen = new Date(player.last_regen);
      const timeSinceRegen = now.getTime() - lastRegen.getTime();
      
      // Regenerate gas every 30 seconds
      const regenIntervalMs = 30 * 1000;
      
      if (timeSinceRegen >= regenIntervalMs) {
        const regenCycles = Math.floor(timeSinceRegen / regenIntervalMs);
        
        // Base regeneration: 3 gas per 30 seconds
        let gasToAdd = regenCycles * 3;
        
        // Get gas vent bonus
        const gasVentResult = await query(`
          SELECT COUNT(*) as count
          FROM game_tiles 
          WHERE game_instance_id = $1 AND owner_id = $2 AND is_gas_vent = true
        `, [gameId, player.player_id]);
        
        const ventCount = parseInt(gasVentResult.rows[0]?.count || '0');
        if (ventCount > 0) {
          // +2 gas per vent per regen cycle
          gasToAdd += regenCycles * ventCount * 2;
        }
        
        if (gasToAdd > 0) {
          // Apply gas regeneration (cap at 200)
          await query(`
            UPDATE player_game_states 
            SET 
              gas_units = LEAST(gas_units + $1, 200),
              last_gas_regen = NOW()
            WHERE 
              game_instance_id = $2 AND 
              player_id = $3
          `, [gasToAdd, gameId, player.player_id]);
          
          console.log(`[GAS-REGEN] Player ${player.player_id} gained ${gasToAdd} gas (${ventCount} vents controlled)`);
        }
      }
    }
  } catch (error) {
    console.error('Error applying gas regeneration:', error);
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