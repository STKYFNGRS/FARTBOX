import { NextRequest, NextResponse } from 'next/server';
import { query, getAdjacentCoords, GameInstance, PlayerGameState, GameTile } from '../../../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Process a game action (emit gas, bomb, defend)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    const body = await request.json();
    const { playerId, actionType, targetX, targetY, gasSpent } = body;
    
    if (!playerId || !actionType || targetX === undefined || targetY === undefined || !gasSpent) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Verify game is active and get current turn
    const gameResult = await query<GameInstance & {current_turn_player_id: number}>(`
      SELECT status, current_turn_player_id
      FROM game_instances 
      WHERE id = $1
    `, [gameId]);
    
    if (gameResult.rowCount === 0 || gameResult.rows[0]?.status !== 'active') {
      return NextResponse.json(
        { error: 'Game is not active' },
        { status: 400 }
      );
    }
    
    const game = gameResult.rows[0];
    
    // Check if it's this player's turn
    if (game.current_turn_player_id !== playerId) {
      return NextResponse.json(
        { error: 'It is not your turn' },
        { status: 400 }
      );
    }
    
    // Verify player is in the game and has enough gas
    const playerStateResult = await query<PlayerGameState>(`
      SELECT 
        gas_units, 
        last_action_time
      FROM 
        player_game_states 
      WHERE 
        game_instance_id = $1 AND 
        player_id = $2
    `, [gameId, playerId]);
    
    if (playerStateResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Player is not in this game' },
        { status: 400 }
      );
    }
    
    const playerState = playerStateResult.rows[0];
    
    if (playerState.gas_units < gasSpent) {
      return NextResponse.json(
        { error: 'Not enough gas' },
        { status: 400 }
      );
    }
    
    // Check cooldown (simplified for turn-based gameplay)
    const now = new Date();
    
    // For turn-based gameplay, we'll use a simple 5-second cooldown to prevent spam
    if (playerState.last_action_time) {
      const lastActionTime = new Date(playerState.last_action_time);
      
      // Debug timestamp handling
      console.log('🕐 Cooldown check:', {
        lastActionTime: lastActionTime.toISOString(),
        now: now.toISOString(),
        lastActionTimeMs: lastActionTime.getTime(),
        nowMs: now.getTime()
      });
      
      const timeSinceLastAction = now.getTime() - lastActionTime.getTime();
      
      // Only apply cooldown if action was very recent (prevent timezone issues)
      if (timeSinceLastAction > 0 && timeSinceLastAction < 5000) {
        const remainingCooldown = Math.ceil((5000 - timeSinceLastAction) / 1000);
        return NextResponse.json(
          { error: `Please wait ${remainingCooldown} seconds between actions` },
          { status: 400 }
        );
      }
      
      // If we get a negative time difference, it suggests timezone issues - ignore cooldown
      if (timeSinceLastAction < 0) {
        console.log('⚠️ Negative time difference detected, ignoring cooldown check');
      }
    }
    
    // Get player's owned tiles to check if target is valid
    const playerTilesResult = await query<{x_coord: number, y_coord: number}>(`
      SELECT x_coord, y_coord 
      FROM game_tiles 
      WHERE game_instance_id = $1 AND owner_id = $2
    `, [gameId, playerId]);
    
    const playerTiles = playerTilesResult.rows;
    
    console.log(`Player ${playerId} has ${playerTiles.length} territories in game ${gameId}`);
    
    // If player has no territories and it's an emit action on an unclaimed tile, allow it (starting move)
    if (playerTiles.length === 0 && actionType === 'emit') {
      console.log(`Player ${playerId} making first move - allowing direct territory claim`);
      
      // Get target tile info
      const targetTileResult = await query<GameTile>(`
        SELECT 
          id, 
          owner_id, 
          gas_type, 
          defense_bonus,
          defense_bonus_until,
          is_gas_vent
        FROM 
          game_tiles 
        WHERE 
          game_instance_id = $1 AND 
          x_coord = $2 AND 
          y_coord = $3
      `, [gameId, parseInt(targetX), parseInt(targetY)]);
      
      if (targetTileResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Invalid target tile' },
          { status: 400 }
        );
      }
      
      const targetTile = targetTileResult.rows[0];
      
      // Only allow claiming unclaimed, non-gas-vent tiles for first move
      if (!targetTile.owner_id && !targetTile.is_gas_vent) {
        try {
          await query('BEGIN');
          
          // Claim the territory
          await query(`
            UPDATE game_tiles 
            SET 
              owner_id = $1, 
              gas_type = 'green'
            WHERE 
              id = $2
          `, [playerId, targetTile.id]);
          
          // Update player's territory count
          await query(`
            UPDATE player_game_states 
            SET territories_count = territories_count + 1 
            WHERE game_instance_id = $1 AND player_id = $2
          `, [gameId, playerId]);
          
          // Deduct gas and update last action time
          await query(`
            UPDATE player_game_states 
            SET 
              gas_units = gas_units - $1,
              last_action_time = CURRENT_TIMESTAMP
            WHERE 
              game_instance_id = $2 AND 
              player_id = $3
          `, [gasSpent, gameId, playerId]);
          
          // Log the action
          await query(`
            INSERT INTO player_actions (game_instance_id, player_id, action_type, target_x, target_y, gas_spent, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
          `, [gameId, playerId, actionType, parseInt(targetX), parseInt(targetY), gasSpent]);
          
          await query('COMMIT');
          
          return NextResponse.json({
            success: true,
            message: 'First territory claimed successfully!'
          });
          
        } catch (error) {
          await query('ROLLBACK');
          console.error('Error processing first move:', error);
          return NextResponse.json(
            { error: 'Failed to claim territory' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Can only claim empty territories for your first move' },
          { status: 400 }
        );
      }
    }
    
    // Get target tile info
    const targetTileResult = await query<GameTile>(`
      SELECT 
        id, 
        owner_id, 
        gas_type, 
        defense_bonus,
        defense_bonus_until,
        is_gas_vent
      FROM 
        game_tiles 
      WHERE 
        game_instance_id = $1 AND 
        x_coord = $2 AND 
        y_coord = $3
    `, [gameId, parseInt(targetX), parseInt(targetY)]);
    
    if (targetTileResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Invalid target tile' },
        { status: 400 }
      );
    }
    
    const targetTile = targetTileResult.rows[0];
    
    // Check if the action is valid based on the type
    let actionResult = false;
    let message = '';
    
    // Begin transaction
    await query('BEGIN');
    
    try {
      // Execute action based on type
      if (actionType === 'emit') {
        // Basic attack - verify target is adjacent to owned territory
        const isAdjacent = playerTiles.some((tile: any) => {
          const adjacentTiles = getAdjacentCoords(tile.x_coord, tile.y_coord);
          return adjacentTiles.some((adj: any) => adj.x === parseInt(targetX) && adj.y === parseInt(targetY));
        });
        
        if (!isAdjacent) {
          await query('ROLLBACK');
          return NextResponse.json(
            { error: 'Target tile is not adjacent to any of your territories' },
            { status: 400 }
          );
        }
        
        // If target is owned by another player, attack it
        if (targetTile.owner_id && targetTile.owner_id !== playerId) {
          const attackResult = await processAttack(parseInt(gameId), playerId, targetTile, gasSpent);
          actionResult = attackResult.success;
          message = attackResult.message;
        } 
        // If target is unclaimed, claim it
        else if (!targetTile.owner_id) {
          await query(`
            UPDATE game_tiles 
            SET 
              owner_id = $1, 
              gas_type = (
                SELECT COALESCE(
                  (SELECT gas_type FROM game_tiles WHERE game_instance_id = $2 AND owner_id = $1 LIMIT 1),
                  'green'
                )
              )
            WHERE 
              id = $3
          `, [playerId, gameId, targetTile.id]);
          
          // Update player's territory count
          await query(`
            UPDATE player_game_states 
            SET territories_count = territories_count + 1 
            WHERE game_instance_id = $1 AND player_id = $2
          `, [gameId, playerId]);
          
          actionResult = true;
          message = 'Territory claimed successfully';
        } else {
          // Player already owns this tile
          await query('ROLLBACK');
          return NextResponse.json(
            { error: 'You already own this territory' },
            { status: 400 }
          );
        }
      } 
      else if (actionType === 'bomb') {
        // Gas bomb - affects target tile and adjacent tiles
        // Check if target is adjacent to owned territory
        const isAdjacent = playerTiles.some((tile: any) => {
          const adjacentTiles = getAdjacentCoords(tile.x_coord, tile.y_coord);
          return adjacentTiles.some((adj: any) => adj.x === parseInt(targetX) && adj.y === parseInt(targetY));
        });
        
        if (!isAdjacent) {
          await query('ROLLBACK');
          return NextResponse.json(
            { error: 'Target tile is not adjacent to any of your territories' },
            { status: 400 }
          );
        }
        
        // Process gas bomb attack - higher power attack that affects adjacent tiles
        // First, attack the target tile
        if (targetTile.owner_id && targetTile.owner_id !== playerId) {
          const attackResult = await processAttack(parseInt(gameId), playerId, targetTile, gasSpent, true);
          actionResult = attackResult.success;
          message = attackResult.message;
          
          // If the target was captured, also affect adjacent tiles
          if (attackResult.success) {
            // Get adjacent tiles to the target
            const adjacentCoords = getAdjacentCoords(parseInt(targetX), parseInt(targetY));
            
            // Attack each adjacent tile with reduced power
            for (const adj of adjacentCoords) {
              const adjTileResult = await query<GameTile>(`
                SELECT 
                  id, 
                  owner_id, 
                  gas_type, 
                  defense_bonus,
                  defense_bonus_until
                FROM 
                  game_tiles 
                WHERE 
                  game_instance_id = $1 AND 
                  x_coord = $2 AND 
                  y_coord = $3
              `, [gameId, adj.x, adj.y]);
              
              if (adjTileResult.rowCount > 0) {
                const adjTile = adjTileResult.rows[0];
                
                // Only attack tiles owned by other players, not ourselves
                if (adjTile.owner_id && adjTile.owner_id !== playerId) {
                  // Bomb has splash damage at 50% power
                  const splashAttackResult = await processAttack(parseInt(gameId), playerId, adjTile, gasSpent * 0.5, true);
                  if (splashAttackResult.success) {
                    message += ' Adjacent territory also captured!';
                  }
                }
              }
            }
          }
        } 
        // If target is unclaimed, claim it and adjacent tiles
        else if (!targetTile.owner_id) {
          await query(`
            UPDATE game_tiles 
            SET 
              owner_id = $1, 
              gas_type = (
                SELECT COALESCE(
                  (SELECT gas_type FROM game_tiles WHERE game_instance_id = $2 AND owner_id = $1 LIMIT 1),
                  'green'
                )
              )
            WHERE 
              id = $3
          `, [playerId, gameId, targetTile.id]);
          
          // Update player's territory count
          await query(`
            UPDATE player_game_states 
            SET territories_count = territories_count + 1 
            WHERE game_instance_id = $1 AND player_id = $2
          `, [gameId, playerId]);
          
          // Try to claim adjacent empty tiles with bomb splash
          const adjacentCoords = getAdjacentCoords(parseInt(targetX), parseInt(targetY));
          let additionalTerritories = 0;
          
          for (const adj of adjacentCoords) {
            const adjTileResult = await query<GameTile>(`
              SELECT 
                id, 
                owner_id
              FROM 
                game_tiles 
              WHERE 
                game_instance_id = $1 AND 
                x_coord = $2 AND 
                y_coord = $3 AND
                owner_id IS NULL
            `, [gameId, adj.x, adj.y]);
            
            if (adjTileResult.rowCount > 0) {
              const adjTile = adjTileResult.rows[0];
              
              // Claim this empty tile
              await query(`
                UPDATE game_tiles 
                SET 
                  owner_id = $1, 
                  gas_type = (
                    SELECT COALESCE(
                      (SELECT gas_type FROM game_tiles WHERE game_instance_id = $2 AND owner_id = $1 LIMIT 1),
                      'green'
                    )
                  )
                WHERE 
                  id = $3
              `, [playerId, gameId, adjTile.id]);
              
              additionalTerritories++;
            }
          }
          
          if (additionalTerritories > 0) {
            // Update player's territory count with additional territories
            await query(`
              UPDATE player_game_states 
              SET territories_count = territories_count + $1 
              WHERE game_instance_id = $2 AND player_id = $3
            `, [additionalTerritories, gameId, playerId]);
            
            message = `Territory claimed successfully with ${additionalTerritories} additional adjacent tiles!`;
          } else {
            message = 'Territory claimed successfully!';
          }
          
          actionResult = true;
        } else {
          // Player already owns this tile
          await query('ROLLBACK');
          return NextResponse.json(
            { error: 'You already own this territory' },
            { status: 400 }
          );
        }
      } 
      else if (actionType === 'defend') {
        // Defensive cloud - can only target owned tiles
        if (targetTile.owner_id !== playerId) {
          await query('ROLLBACK');
          return NextResponse.json(
            { error: 'You can only defend territories you own' },
            { status: 400 }
          );
        }
        
        // Set defense bonus
        const defenseBonus = 50; // 50% bonus
        const duration = 60 * 1000; // 1 minute
        const defenseUntil = new Date(now.getTime() + duration);
        
        await query(`
          UPDATE game_tiles 
          SET 
            defense_bonus = $1, 
            defense_bonus_until = $2 
          WHERE 
            id = $3
        `, [defenseBonus, defenseUntil, targetTile.id]);
        
        actionResult = true;
        message = 'Defense fortified successfully';
      } else {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: 'Invalid action type' },
          { status: 400 }
        );
      }
      
      // If action was successful, consume gas and update last action time
      if (actionResult) {
        await query(`
          UPDATE player_game_states 
          SET 
            gas_units = gas_units - $1,
            last_action_time = CURRENT_TIMESTAMP
          WHERE 
            game_instance_id = $2 AND 
            player_id = $3
        `, [gasSpent, gameId, playerId]);
        
        // Record action in action history
        await query(`
          INSERT INTO player_actions 
            (game_instance_id, player_id, action_type, target_x, target_y, gas_spent, result, created_at) 
          VALUES 
            ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [gameId, playerId, actionType, parseInt(targetX), parseInt(targetY), gasSpent, actionResult ? 'success' : 'fail']);
        
        // Advance to next player's turn
        await advanceToNextTurn(parseInt(gameId), playerId);
        
        // Check for victory condition (40+ territories for balanced gameplay on 96-tile map)
        const victoryCheck = await query<{territories_count: number}>(`
          SELECT territories_count 
          FROM player_game_states 
          WHERE game_instance_id = $1 AND player_id = $2
        `, [gameId, playerId]);
        
        if (victoryCheck.rows[0]?.territories_count >= 40) {
          // Player has achieved dominance victory (40+ territories out of 96 total = ~42%)
          await endGame(parseInt(gameId), playerId, 'dominance');
          message += ' 🎉 VICTORY! You have achieved territorial dominance!';
        }
        
        // Add gas vent bonus if player controls gas vents
        const gasVentBonus = await query<{count: string}>(`
          SELECT COUNT(*) as count
          FROM game_tiles 
          WHERE game_instance_id = $1 AND owner_id = $2 AND is_gas_vent = true
        `, [gameId, playerId]);
        
        const ventCount = parseInt(gasVentBonus.rows[0]?.count || '0');
        if (ventCount > 0) {
          const bonusGas = ventCount * 5; // 5 bonus gas per vent controlled
          await query(`
            UPDATE player_game_states 
            SET gas_units = LEAST(gas_units + $1, 200)
            WHERE game_instance_id = $2 AND player_id = $3
          `, [bonusGas, gameId, playerId]);
          
          message += ` +${bonusGas} bonus gas from ${ventCount} gas vent${ventCount > 1 ? 's' : ''}!`;
        }
        
        await query('COMMIT');
        
        return NextResponse.json({
          success: true,
          message,
          gasRemaining: playerState.gas_units - gasSpent
        });
      } else {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: 'Action failed' },
          { status: 400 }
        );
      }
    } catch (error) {
      await query('ROLLBACK');
      console.error('Error processing action:', error);
      return NextResponse.json(
        { error: 'Failed to process action' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in game action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to process an attack
async function processAttack(gameId: number, attackerId: number, targetTile: GameTile, gasSpent: number, isBomb: boolean = false) {
  try {
    // Get attacker's NFT potency (from player's owned tiles gas_type)
    const attackerInfoResult = await query<{gas_type: string}>(`
      SELECT gas_type 
      FROM game_tiles 
      WHERE game_instance_id = $1 AND owner_id = $2 
      LIMIT 1
    `, [gameId, attackerId]);
    
    const attackerGasType = attackerInfoResult.rows[0]?.gas_type || 'green';
    
    // Calculate attack power
    let typeModifier = 1.0;
    if (attackerGasType === 'yellow') {
      typeModifier = 1.5; // Yellow is offensive
    } else if (attackerGasType === 'toxic') {
      typeModifier = 0.8; // Toxic is defensive
    }
    
    // Bombs get an additional power multiplier
    const bombModifier = isBomb ? 1.8 : 1.0;
    
    const attackPower = gasSpent * 5 * typeModifier * bombModifier; // Base potency of 5
    
    // Calculate defense power
    let defenseTypeModifier = 1.0;
    if (targetTile.gas_type === 'green') {
      defenseTypeModifier = 1.0; // Green is balanced
    } else if (targetTile.gas_type === 'yellow') {
      defenseTypeModifier = 0.7; // Yellow has weak defense
    } else if (targetTile.gas_type === 'toxic') {
      defenseTypeModifier = 1.3; // Toxic is strong on defense
    }
    
    // Check if defense bonus is active
    const now = new Date();
    let defenseBonus = 0;
    
    if (targetTile.defense_bonus_until && new Date(targetTile.defense_bonus_until) > now) {
      defenseBonus = targetTile.defense_bonus;
    }
    
    const defensePower = 50 * defenseTypeModifier * (1 + defenseBonus / 100);
    
    // Compare attack vs defense
    if (attackPower > defensePower) {
      // Attack succeeds - capture territory
      await query(`
        UPDATE game_tiles 
        SET owner_id = $1, gas_type = $2 
        WHERE id = $3
      `, [attackerId, attackerGasType, targetTile.id]);
      
      // Update territory counts
      await query(`
        UPDATE player_game_states 
        SET territories_count = territories_count + 1 
        WHERE game_instance_id = $1 AND player_id = $2
      `, [gameId, attackerId]);
      
      await query(`
        UPDATE player_game_states 
        SET territories_count = territories_count - 1 
        WHERE game_instance_id = $1 AND player_id = $2
      `, [gameId, targetTile.owner_id]);
      
      return {
        success: true,
        message: isBomb 
          ? 'Gas bomb successful! Territory captured.' 
          : 'Attack successful! Territory captured.'
      };
    } else {
      // Attack fails
      return {
        success: false,
        message: isBomb 
          ? 'Gas bomb failed to overcome enemy defenses.' 
          : 'Attack failed. Enemy defenses were too strong.'
      };
    }
  } catch (error) {
    console.error('Error processing attack:', error);
    return {
      success: false,
      message: 'Error processing attack'
    };
  }
}

// Helper function to end a game
async function endGame(gameId: number, winnerId: number, victoryType: string) {
  try {
    // Update game status
    await query(`
      UPDATE game_instances 
      SET status = 'completed', end_time = NOW() 
      WHERE id = $1
    `, [gameId]);
    
    // Get all players in the game
    const playersResult = await query<{player_id: number, territories_count: number}>(`
      SELECT 
        player_id,
        territories_count
      FROM 
        player_game_states 
      WHERE 
        game_instance_id = $1
      ORDER BY 
        territories_count DESC
    `, [gameId]);
    
    const players = playersResult.rows;
    
    // Record match results for each player
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const placement = i + 1; // 1st, 2nd, 3rd, etc.
      
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
      
      // Record match result
      await query(`
        INSERT INTO match_results 
          (game_instance_id, player_id, placement, territories_final, tokens_earned, xp_earned) 
        VALUES 
          ($1, $2, $3, $4, $5, $6)
      `, [gameId, player.player_id, placement, player.territories_count, tokensEarned, xpEarned]);
    }
    
    return true;
  } catch (error) {
    console.error('Error ending game:', error);
    return false;
  }
}

// Helper function to advance to the next player's turn
async function advanceToNextTurn(gameId: number, currentPlayerId: number) {
  try {
    // Get all players in the game ordered by turn_order
    const playersResult = await query<{player_id: number, turn_order: number}>(`
      SELECT player_id, turn_order
      FROM player_game_states
      WHERE game_instance_id = $1
      ORDER BY turn_order
    `, [gameId]);
    
    const players = playersResult.rows;
    
    if (players.length === 0) {
      return false;
    }
    
    // Find the next player's ID
    let nextPlayerId = players[0].player_id; // Default to first player
    for (let i = 0; i < players.length; i++) {
      if (players[i].player_id === currentPlayerId) {
        nextPlayerId = players[(i + 1) % players.length].player_id;
        break;
      }
    }
    
    // Update game turn
    await query(`
      UPDATE game_instances 
      SET current_turn_player_id = $1 
      WHERE id = $2
    `, [nextPlayerId, gameId]);
    
    console.log(`🔄 Turn advanced from player ${currentPlayerId} to player ${nextPlayerId} in game ${gameId}`);
    
    return true;
  } catch (error) {
    console.error('Error advancing to next turn:', error);
    return false;
  }
} 