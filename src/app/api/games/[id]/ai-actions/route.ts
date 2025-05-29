import { NextRequest, NextResponse } from 'next/server';
import { query, getAdjacentCoords } from '../../../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Process AI bot actions for a game
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    
    console.log(`[AI-ACTIONS] Processing AI actions for game ${gameId}`);
    
    // First check if game is active
    const gameResult = await query(`
      SELECT status FROM game_instances WHERE id = $1
    `, [gameId]);
    
    if (gameResult.rowCount === 0) {
      console.log(`[AI-ACTIONS] Game ${gameId} not found`);
      return NextResponse.json({ message: 'Game not found', actionsPerformed: 0 });
    }
    
    if (gameResult.rows[0].status !== 'active') {
      console.log(`[AI-ACTIONS] Game ${gameId} is not active (status: ${gameResult.rows[0].status})`);
      return NextResponse.json({ message: `Game is ${gameResult.rows[0].status}, not processing AI actions`, actionsPerformed: 0 });
    }
    
    // Get all AI players in this game
    const aiPlayersResult = await query(`
      SELECT 
        p.id,
        p.username,
        pgs.gas_units,
        pgs.last_action_time,
        pgs.territories_count
      FROM players p
      INNER JOIN player_game_states pgs ON p.id = pgs.player_id
      WHERE pgs.game_instance_id = $1 AND p.is_bot = true
    `, [gameId]);
    
    const aiPlayers = aiPlayersResult.rows;
    
    console.log(`[AI-ACTIONS] Found ${aiPlayers.length} AI players in game ${gameId}`);
    
    // Also check all players to see if there are any bots
    const allPlayersResult = await query(`
      SELECT 
        p.id,
        p.username,
        p.is_bot,
        pgs.gas_units
      FROM players p
      INNER JOIN player_game_states pgs ON p.id = pgs.player_id
      WHERE pgs.game_instance_id = $1
    `, [gameId]);
    
    console.log(`[AI-ACTIONS] All players in game ${gameId}:`, allPlayersResult.rows.map(p => ({
      id: p.id,
      username: p.username,
      isBot: p.is_bot,
      gas: p.gas_units
    })));
    
    if (aiPlayers.length === 0) {
      console.log(`[AI-ACTIONS] No AI players found in game ${gameId}`);
      return NextResponse.json({ message: 'No AI players in this game', actionsPerformed: 0 });
    }
    
    let actionsPerformed = 0;
    
    for (const aiPlayer of aiPlayers) {
      console.log(`[AI-ACTIONS] Processing AI player ${aiPlayer.username} (ID: ${aiPlayer.id})`);
      console.log(`[AI-ACTIONS] AI has ${aiPlayer.gas_units} gas and ${aiPlayer.territories_count} territories`);
      
      // Check if AI can perform an action (cooldown check)
      const now = new Date();
      const lastActionTime = aiPlayer.last_action_time ? new Date(aiPlayer.last_action_time) : null;
      
      // AI has very short cooldowns to make game dynamic
      const aiCooldown = 8 * 1000; // 8 seconds between AI actions
      
      if (lastActionTime) {
        const timeSinceLastAction = now.getTime() - lastActionTime.getTime();
        
        // Safety check - if last action time is unreasonable, reset it
        if (timeSinceLastAction < 0 || timeSinceLastAction > 3600000) {
          console.log(`[AI-ACTIONS] FIXING: AI ${aiPlayer.username} has unreasonable cooldown (${Math.floor(timeSinceLastAction / 1000)}s), resetting`);
          await query(`
            UPDATE player_game_states 
            SET last_action_time = NULL
            WHERE game_instance_id = $1 AND player_id = $2
          `, [gameId, aiPlayer.id]);
          // Allow AI to proceed
        } else if (timeSinceLastAction < aiCooldown) {
          const remainingCooldown = Math.ceil((aiCooldown - timeSinceLastAction) / 1000);
          console.log(`[AI-ACTIONS] AI ${aiPlayer.username} on cooldown for ${remainingCooldown}s`);
          continue; // Skip this AI, still on cooldown
        }
      }
      
      // Get AI's current territories
      const territoriesResult = await query(`
        SELECT x_coord, y_coord, gas_type, defense_bonus
        FROM game_tiles
        WHERE game_instance_id = $1 AND owner_id = $2
      `, [gameId, aiPlayer.id]);
      
      const aiTerritories = territoriesResult.rows;
      
      console.log(`[AI-ACTIONS] AI ${aiPlayer.username} owns ${aiTerritories.length} territories`);
      
      if (aiTerritories.length === 0) {
        console.log(`[AI-ACTIONS] AI ${aiPlayer.username} has no territories, attempting first move`);
        
        // AI first move - find any unclaimed, non-gas-vent tile
        const allTilesResult = await query(`
          SELECT x_coord, y_coord, owner_id, is_gas_vent
          FROM game_tiles
          WHERE game_instance_id = $1 AND owner_id IS NULL AND is_gas_vent = false
          ORDER BY RANDOM()
          LIMIT 5
        `, [gameId]);
        
        const unclaimedTiles = allTilesResult.rows;
        
        if (unclaimedTiles.length > 0 && aiPlayer.gas_units >= 10) {
          const targetTile = unclaimedTiles[0]; // Pick first available
          
          console.log(`[AI-ACTIONS] AI ${aiPlayer.username} making first move at (${targetTile.x_coord}, ${targetTile.y_coord})`);
          
          try {
            const actionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/games/${gameId}/actions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerId: aiPlayer.id,
                actionType: 'emit',
                targetX: targetTile.x_coord,
                targetY: targetTile.y_coord,
                gasSpent: 10
              })
            });
            
            const actionResult = await actionResponse.json();
            
            if (actionResponse.ok && actionResult.success) {
              actionsPerformed++;
              console.log(`[AI-ACTIONS] ✅ AI ${aiPlayer.username} successfully made first move`);
            } else {
              console.log(`[AI-ACTIONS] ❌ AI ${aiPlayer.username} first move failed: ${actionResult.error || 'Unknown error'}`);
            }
          } catch (error) {
            console.error(`[AI-ACTIONS] Error executing AI first move for ${aiPlayer.username}:`, error);
          }
        } else {
          console.log(`[AI-ACTIONS] AI ${aiPlayer.username} cannot make first move - no tiles available or insufficient gas`);
        }
        
        continue; // Move to next AI player
      }
      
      // Get all possible target tiles (adjacent to AI territories)
      const possibleTargets = new Set<string>();
      
      aiTerritories.forEach(territory => {
        const adjacentCoords = getAdjacentCoords(territory.x_coord, territory.y_coord);
        adjacentCoords.forEach(coord => {
          // Only target tiles within game bounds (8x12 map)
          if (coord.x >= 0 && coord.x < 12 && coord.y >= 0 && coord.y < 8) {
            possibleTargets.add(`${coord.x},${coord.y}`);
          }
        });
      });
      
      console.log(`[AI-ACTIONS] AI ${aiPlayer.username} has ${possibleTargets.size} possible targets`);
      
      if (possibleTargets.size === 0) {
        console.log(`[AI-ACTIONS] AI ${aiPlayer.username} has no valid targets`);
        continue;
      }
      
      // Get information about all possible target tiles
      const targetCoords = Array.from(possibleTargets).map(coord => {
        const [x, y] = coord.split(',').map(Number);
        return { x, y };
      });
      
      const targetTilesResult = await query(`
        SELECT x_coord, y_coord, owner_id, gas_type, defense_bonus, is_gas_vent
        FROM game_tiles
        WHERE game_instance_id = $1 
        AND (${targetCoords.map((_, i) => `(x_coord = $${i*2 + 2} AND y_coord = $${i*2 + 3})`).join(' OR ')})
      `, [gameId, ...targetCoords.flatMap(c => [c.x, c.y])]);
      
      const targetTiles = targetTilesResult.rows;
      
      console.log(`[AI-ACTIONS] AI ${aiPlayer.username} analyzing ${targetTiles.length} target tiles`);
      
      // AI Strategy: Prioritize gas vents > unclaimed tiles > enemy tiles
      let bestTarget = null;
      let actionType = 'emit';
      
      // 1. PRIORITY: Gas vents (even if owned by enemies)
      const gasVentTiles = targetTiles.filter(t => t.is_gas_vent && t.owner_id !== aiPlayer.id);
      if (gasVentTiles.length > 0 && aiPlayer.gas_units >= 25) {
        bestTarget = gasVentTiles[Math.floor(Math.random() * gasVentTiles.length)];
        actionType = 'bomb'; // Use bomb for important targets
        console.log(`[AI-ACTIONS] AI ${aiPlayer.username} targeting gas vent at (${bestTarget.x_coord}, ${bestTarget.y_coord})`);
      }
      
      // 2. Look for unclaimed tiles
      if (!bestTarget) {
        const unclaimedTiles = targetTiles.filter(t => !t.owner_id);
        if (unclaimedTiles.length > 0) {
          bestTarget = unclaimedTiles[Math.floor(Math.random() * unclaimedTiles.length)];
          actionType = aiPlayer.gas_units >= 25 && Math.random() > 0.7 ? 'bomb' : 'emit';
          console.log(`[AI-ACTIONS] AI ${aiPlayer.username} targeting unclaimed tile at (${bestTarget.x_coord}, ${bestTarget.y_coord})`);
        }
      }
      
      // 3. Attack enemy tiles (avoid heavily defended ones)
      if (!bestTarget) {
        const enemyTiles = targetTiles.filter(t => t.owner_id && t.owner_id !== aiPlayer.id && (t.defense_bonus || 0) < 30);
        if (enemyTiles.length > 0) {
          bestTarget = enemyTiles[Math.floor(Math.random() * enemyTiles.length)];
          // Use bomb for attacks more often
          actionType = (aiPlayer.gas_units >= 25 && Math.random() > 0.5) ? 'bomb' : 'emit';
          console.log(`[AI-ACTIONS] AI ${aiPlayer.username} attacking enemy tile at (${bestTarget.x_coord}, ${bestTarget.y_coord})`);
        }
      }
      
      // 4. Defend own territories occasionally
      if (!bestTarget && aiPlayer.territories_count > 2 && Math.random() > 0.8) {
        const vulnerableTerritories = aiTerritories.filter(t => (t.defense_bonus || 0) < 20);
        if (vulnerableTerritories.length > 0) {
          const territoryToDefend = vulnerableTerritories[Math.floor(Math.random() * vulnerableTerritories.length)];
          bestTarget = { x_coord: territoryToDefend.x_coord, y_coord: territoryToDefend.y_coord };
          actionType = 'defend';
          console.log(`[AI-ACTIONS] AI ${aiPlayer.username} defending territory at (${bestTarget.x_coord}, ${bestTarget.y_coord})`);
        }
      }
      
      if (!bestTarget) {
        console.log(`[AI-ACTIONS] AI ${aiPlayer.username} found no suitable action`);
        continue; // No valid action for this AI
      }
      
      // Determine gas cost
      const gasCost = actionType === 'emit' ? 10 : actionType === 'bomb' ? 25 : 15;
      
      if (aiPlayer.gas_units < gasCost) {
        console.log(`[AI-ACTIONS] AI ${aiPlayer.username} has insufficient gas (${aiPlayer.gas_units} < ${gasCost})`);
        continue; // Not enough gas
      }
      
      // Execute the AI action
      try {
        console.log(`[AI-ACTIONS] AI ${aiPlayer.username} executing ${actionType} at (${bestTarget.x_coord}, ${bestTarget.y_coord}) for ${gasCost} gas`);
        
        const actionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/games/${gameId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: aiPlayer.id,
            actionType,
            targetX: bestTarget.x_coord,
            targetY: bestTarget.y_coord,
            gasSpent: gasCost
          })
        });
        
        const actionResult = await actionResponse.json();
        
        if (actionResponse.ok && actionResult.success) {
          actionsPerformed++;
          console.log(`[AI-ACTIONS] ✅ AI ${aiPlayer.username} successfully performed ${actionType} at (${bestTarget.x_coord}, ${bestTarget.y_coord})`);
          if (actionResult.message) {
            console.log(`[AI-ACTIONS] Result: ${actionResult.message}`);
          }
        } else {
          console.log(`[AI-ACTIONS] ❌ AI ${aiPlayer.username} action failed: ${actionResult.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error(`[AI-ACTIONS] Error executing AI action for ${aiPlayer.username}:`, error);
      }
    }
    
    console.log(`[AI-ACTIONS] Completed AI processing for game ${gameId}: ${actionsPerformed} actions performed`);
    
    return NextResponse.json({ 
      message: `Processed ${actionsPerformed} AI actions`,
      actionsPerformed 
    });
    
  } catch (error) {
    console.error('[AI-ACTIONS] Error processing AI actions:', error);
    return NextResponse.json(
      { error: 'Failed to process AI actions' },
      { status: 500 }
    );
  }
}