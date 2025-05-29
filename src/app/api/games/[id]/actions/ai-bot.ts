import { query, GameTile, PlayerGameState, getAdjacentCoords } from '../../../../../lib/db';

// Types for bot decision making
type BotAction = {
  actionType: 'emit' | 'bomb' | 'defend';
  targetX: number;
  targetY: number;
  gasSpent: number;
};

type GameState = {
  myTiles: GameTile[];
  otherPlayerTiles: GameTile[];
  emptyTiles: GameTile[];
  myGasUnits: number;
  myTerritoryCount: number;
  totalPlayers: number;
};

/**
 * Process bot actions for a game
 * This should be called periodically to have bots take actions
 */
export async function processBotActions(gameId: number | string) {
  const gameIdNum = typeof gameId === 'string' ? parseInt(gameId) : gameId;
  
  try {
    // Check if game is active
    const gameResult = await query<{status: string}>(`
      SELECT status FROM game_instances WHERE id = $1
    `, [gameIdNum]);
    
    if (gameResult.rowCount === 0 || gameResult.rows[0].status !== 'active') {
      console.log(`Game ${gameIdNum} is not active, skipping bot actions`);
      return false;
    }
    
    // Get bot players in this game
    const botPlayersResult = await query<{player_id: number, gas_units: number, territories_count: number, last_action_time: Date | null}>(`
      SELECT 
        pgs.player_id, 
        pgs.gas_units, 
        pgs.territories_count,
        pgs.last_action_time
      FROM 
        player_game_states pgs
      JOIN 
        players p ON pgs.player_id = p.id
      WHERE 
        pgs.game_instance_id = $1 AND 
        p.is_bot = true
    `, [gameIdNum]);
    
    // Process each bot's action
    for (const bot of botPlayersResult.rows) {
      // Check if bot can act (no action in last 5 seconds)
      const now = new Date();
      const lastActionTime = bot.last_action_time ? new Date(bot.last_action_time) : null;
      
      if (lastActionTime && (now.getTime() - lastActionTime.getTime() < 5000)) {
        console.log(`Bot ${bot.player_id} is on cooldown, skipping`);
        continue;
      }
      
      // Fetch current game state for this bot
      const gameState = await getBotGameState(gameIdNum, bot.player_id);
      
      // Determine action
      const action = decideBotAction(gameState);
      
      if (action) {
        // Take the action
        await takeBotAction(gameIdNum, bot.player_id, action);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error processing bot actions:', error);
    return false;
  }
}

/**
 * Get the current game state from a bot's perspective
 */
async function getBotGameState(gameId: number, botId: number): Promise<GameState> {
  // Get all game tiles
  const tilesResult = await query<GameTile>(`
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
  `, [gameId]);
  
  // Get player state
  const playerStateResult = await query<PlayerGameState>(`
    SELECT 
      gas_units, 
      territories_count
    FROM 
      player_game_states 
    WHERE 
      game_instance_id = $1 AND 
      player_id = $2
  `, [gameId, botId]);
  
  // Get total players
  const playerCountResult = await query<{count: string}>(`
    SELECT COUNT(*) as count FROM player_game_states WHERE game_instance_id = $1
  `, [gameId]);
  
  // Parse game state
  const allTiles = tilesResult.rows;
  const myTiles = allTiles.filter(tile => tile.owner_id === botId);
  const otherPlayerTiles = allTiles.filter(tile => tile.owner_id !== null && tile.owner_id !== botId);
  const emptyTiles = allTiles.filter(tile => tile.owner_id === null);
  
  return {
    myTiles,
    otherPlayerTiles,
    emptyTiles,
    myGasUnits: playerStateResult.rows[0]?.gas_units || 0,
    myTerritoryCount: playerStateResult.rows[0]?.territories_count || 0,
    totalPlayers: parseInt(playerCountResult.rows[0]?.count || '0')
  };
}

/**
 * Decide what action a bot should take
 */
function decideBotAction(state: GameState): BotAction | null {
  // If no gas left, can't do anything
  if (state.myGasUnits < 15) {
    return null;
  }
  
  // Priority 1: Expand territory if we have less than average
  const averageTerritories = 50 / state.totalPlayers;
  
  if (state.myTerritoryCount < averageTerritories) {
    // Find an empty tile adjacent to one of our tiles for expansion
    for (const myTile of state.myTiles) {
      const adjacentCoords = getAdjacentCoords(myTile.x_coord, myTile.y_coord);
      
      for (const coord of adjacentCoords) {
        const targetTile = state.emptyTiles.find(t => 
          t.x_coord === coord.x && t.y_coord === coord.y
        );
        
        if (targetTile) {
          return {
            actionType: 'emit',
            targetX: targetTile.x_coord,
            targetY: targetTile.y_coord,
            gasSpent: 15 // Basic emission cost
          };
        }
      }
    }
  }
  
  // Priority 2: Attack enemy territory if we have enough gas
  if (state.myGasUnits >= 40) {
    // Find an enemy tile adjacent to one of our tiles
    for (const myTile of state.myTiles) {
      const adjacentCoords = getAdjacentCoords(myTile.x_coord, myTile.y_coord);
      
      for (const coord of adjacentCoords) {
        const targetTile = state.otherPlayerTiles.find(t => 
          t.x_coord === coord.x && t.y_coord === coord.y
        );
        
        if (targetTile) {
          // Randomly choose between gas emit and bomb based on available gas
          const attackType = state.myGasUnits >= 40 && Math.random() > 0.7 ? 'bomb' : 'emit';
          
          return {
            actionType: attackType,
            targetX: targetTile.x_coord,
            targetY: targetTile.y_coord,
            gasSpent: attackType === 'bomb' ? 40 : 15
          };
        }
      }
    }
  }
  
  // Priority 3: Defend vulnerable territories if we have enough gas
  if (state.myGasUnits >= 25) {
    // Find our tile that's adjacent to enemy tiles (vulnerable)
    for (const myTile of state.myTiles) {
      const adjacentCoords = getAdjacentCoords(myTile.x_coord, myTile.y_coord);
      const isVulnerable = adjacentCoords.some(coord => 
        state.otherPlayerTiles.some(t => t.x_coord === coord.x && t.y_coord === coord.y)
      );
      
      if (isVulnerable && (!myTile.defense_bonus_until || new Date(myTile.defense_bonus_until) < new Date())) {
        return {
          actionType: 'defend',
          targetX: myTile.x_coord,
          targetY: myTile.y_coord,
          gasSpent: 25 // Defense cost
        };
      }
    }
  }
  
  // If no good move, don't waste gas
  return null;
}

/**
 * Execute a bot action
 */
async function takeBotAction(gameId: number, botId: number, action: BotAction) {
  try {
    // Call the actions API endpoint for this bot
    const response = await fetch(`${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/games/${gameId}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId: botId,
        actionType: action.actionType,
        targetX: action.targetX,
        targetY: action.targetY,
        gasSpent: action.gasSpent
      })
    });
    
    const result = await response.json();
    
    console.log(`Bot ${botId} action result:`, result);
    return result.success;
  } catch (error) {
    console.error(`Error executing bot action:`, error);
    return false;
  }
} 