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
    
    // First check if game is active and get current turn
    const gameResult = await query(`
      SELECT status, current_turn_player_id FROM game_instances WHERE id = $1
    `, [gameId]);
    
    if (gameResult.rowCount === 0) {
      return NextResponse.json({ message: 'Game not found', actionsPerformed: 0 });
    }
    
    const game = gameResult.rows[0];
    if (game.status !== 'active') {
      return NextResponse.json({ message: `Game is ${game.status}, not processing AI actions`, actionsPerformed: 0 });
    }
    
    // Check if it's currently an AI player's turn
    const currentTurnResult = await query(`
      SELECT p.id, p.username, p.is_bot, pgs.gas_units, pgs.territories_count
      FROM players p
      INNER JOIN player_game_states pgs ON p.id = pgs.player_id
      WHERE pgs.game_instance_id = $1 AND p.id = $2
    `, [gameId, game.current_turn_player_id]);
    
    if (currentTurnResult.rowCount === 0) {
      return NextResponse.json({ message: 'No current turn player found', actionsPerformed: 0 });
    }
    
    const currentPlayer = currentTurnResult.rows[0];
    
    // Only process if it's an AI player's turn
    if (!currentPlayer.is_bot) {
      return NextResponse.json({ message: 'Not AI turn', actionsPerformed: 0 });
    }
    
    console.log(`🤖 It's AI ${currentPlayer.username}'s turn - processing action`);
    
    let actionsPerformed = 0;
    
    // Only process the current AI player whose turn it is
    const aiPlayer = currentPlayer;
    
    // Get AI's current territories
    const territoriesResult = await query(`
      SELECT x_coord, y_coord, gas_type, defense_bonus
      FROM game_tiles
      WHERE game_instance_id = $1 AND owner_id = $2
    `, [gameId, aiPlayer.id]);
    
    const aiTerritories = territoriesResult.rows;
    
    if (aiTerritories.length === 0) {
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
          }
        } catch (error) {
          console.error(`[AI-ACTIONS] Error executing AI first move for ${aiPlayer.username}:`, error);
        }
      }
      
      return NextResponse.json({ 
        message: `AI ${aiPlayer.username} made ${actionsPerformed} action(s)`,
        actionsPerformed 
      });
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
    
    if (possibleTargets.size === 0) {
      return NextResponse.json({ 
        message: `AI ${aiPlayer.username} had no valid moves`,
        actionsPerformed: 0 
      });
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
    
    // AI Strategy: Prioritize gas vents > unclaimed tiles > enemy tiles
    let bestTarget = null;
    let actionType = 'emit';
    
    // 1. PRIORITY: Gas vents (even if owned by enemies)
    const gasVentTiles = targetTiles.filter(t => t.is_gas_vent && t.owner_id !== aiPlayer.id);
    if (gasVentTiles.length > 0 && aiPlayer.gas_units >= 25) {
      bestTarget = gasVentTiles[Math.floor(Math.random() * gasVentTiles.length)];
      actionType = 'bomb'; // Use bomb for important targets
    }
    
    // 2. Look for unclaimed tiles
    if (!bestTarget) {
      const unclaimedTiles = targetTiles.filter(t => !t.owner_id);
      if (unclaimedTiles.length > 0) {
        bestTarget = unclaimedTiles[Math.floor(Math.random() * unclaimedTiles.length)];
        actionType = aiPlayer.gas_units >= 25 && Math.random() > 0.8 ? 'bomb' : 'emit';
      }
    }
    
    // 3. Attack enemy tiles (avoid heavily defended ones)
    if (!bestTarget) {
      const enemyTiles = targetTiles.filter(t => t.owner_id && t.owner_id !== aiPlayer.id && (t.defense_bonus || 0) < 30);
      if (enemyTiles.length > 0) {
        bestTarget = enemyTiles[Math.floor(Math.random() * enemyTiles.length)];
        actionType = (aiPlayer.gas_units >= 25 && Math.random() > 0.7) ? 'bomb' : 'emit';
      }
    }
    
    // 4. Defend own territories occasionally
    if (!bestTarget && aiPlayer.territories_count > 2 && Math.random() > 0.8) {
      const vulnerableTerritories = aiTerritories.filter(t => (t.defense_bonus || 0) < 20);
      if (vulnerableTerritories.length > 0) {
        const territoryToDefend = vulnerableTerritories[Math.floor(Math.random() * vulnerableTerritories.length)];
        bestTarget = { x_coord: territoryToDefend.x_coord, y_coord: territoryToDefend.y_coord };
        actionType = 'defend';
      }
    }
    
    if (!bestTarget) {
      return NextResponse.json({ 
        message: `AI ${aiPlayer.username} found no valid targets`,
        actionsPerformed: 0 
      });
    }
    
    // Determine gas cost
    const gasCost = actionType === 'emit' ? 10 : actionType === 'bomb' ? 25 : 15;
    
    if (aiPlayer.gas_units < gasCost) {
      return NextResponse.json({ 
        message: `AI ${aiPlayer.username} has insufficient gas`,
        actionsPerformed: 0 
      });
    }
    
    // Execute the AI action
    try {
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
        console.log(`🤖 AI ${aiPlayer.username} successfully executed ${actionType} at (${bestTarget.x_coord}, ${bestTarget.y_coord})`);
      } else {
        console.log(`🤖 AI ${aiPlayer.username} action failed:`, actionResult.error);
      }
    } catch (error) {
      console.error(`[AI-ACTIONS] Error executing AI action for ${aiPlayer.username}:`, error);
    }
    
    return NextResponse.json({ 
      message: `AI ${aiPlayer.username} made ${actionsPerformed} action(s)`,
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