import { query, getAdjacentCoords } from './db';

// Helper function to start a game
export async function startGame(gameId: number | string) {
  const gameIdNum = typeof gameId === 'string' ? parseInt(gameId) : gameId;
  
  console.log(`🎮 Starting game ${gameIdNum}`);
  
  try {
    // Update game status to active
    await query(`
      UPDATE game_instances 
      SET status = 'active', start_time = NOW() 
      WHERE id = $1
    `, [gameIdNum]);
    
    // Get players in the game
    const playersResult = await query<{player_id: number, is_bot: boolean}>(`
      SELECT 
        pgs.player_id,
        p.is_bot 
      FROM 
        player_game_states pgs
      JOIN 
        players p ON pgs.player_id = p.id
      WHERE 
        pgs.game_instance_id = $1
    `, [gameIdNum]);
    
    const players = playersResult.rows.map((row: any) => row.player_id);
    const hasBots = playersResult.rows.some((row: any) => row.is_bot);
    
    console.log(`👥 ${players.length} players (${hasBots ? 'with AI bots' : 'humans only'})`);
    
    // Initialize map with proper 8x12 grid and randomized gas vents
    const mapSeed = Math.floor(Math.random() * 1000000);
    
    // Use crypto.getRandomValues for better randomness if available, fallback to Math.random
    const getRandomInt = (max: number) => {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return array[0] % max;
      } else {
        return Math.floor(Math.random() * max);
      }
    };
    
    // Create 5 gas vents in random positions (not fixed)
    const gasVents: Array<{x: number, y: number}> = [];
    const usedPositions = new Set<string>();
    
    for (let i = 0; i < 5; i++) {
      let x: number, y: number, posKey: string;
      let attempts = 0;
      
      do {
        x = getRandomInt(12);  // 0-11
        y = getRandomInt(8);   // 0-7
        posKey = `${x},${y}`;
        attempts++;
      } while (usedPositions.has(posKey) && attempts < 50);
      
      if (attempts < 50) {
        gasVents.push({ x, y });
        usedPositions.add(posKey);
        
        try {
          await query(`
            INSERT INTO game_tiles 
              (game_instance_id, x_coord, y_coord, is_gas_vent) 
            VALUES 
              ($1, $2, $3, $4)
          `, [gameIdNum, x, y, true]);
        } catch (ventError) {
          console.error(`❌ Error creating gas vent ${i + 1}:`, ventError);
          throw ventError;
        }
      }
    }
    console.log(`⛽ Created ${gasVents.length} randomized gas vents`);
    
    // Assign initial territories to players - truly randomized positions
    const assignedTiles = [...gasVents];
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const gasType = ['green', 'yellow', 'toxic'][getRandomInt(3)]; // Random gas type too
      
      // Give each player 3 starting territories in random positions
      for (let j = 0; j < 3; j++) {
        let x: number, y: number, posKey: string;
        let attempts = 0;
        
        do {
          x = getRandomInt(12);
          y = getRandomInt(8);
          posKey = `${x},${y}`;
          attempts++;
        } while (assignedTiles.some(tile => tile.x === x && tile.y === y) && attempts < 50);
        
        if (attempts < 50) {
          assignedTiles.push({ x, y });
          
          try {
            // Create territory for player
            await query(`
              INSERT INTO game_tiles 
                (game_instance_id, x_coord, y_coord, owner_id, gas_type) 
              VALUES 
                ($1, $2, $3, $4, $5)
            `, [gameIdNum, x, y, player, gasType]);
          } catch (territoryError) {
            console.error(`❌ Error creating territory for player ${player}:`, territoryError);
            throw territoryError;
          }
        }
      }
      
      try {
        // Update player's territory count
        await query(`
          UPDATE player_game_states 
          SET territories_count = 3 
          WHERE game_instance_id = $1 AND player_id = $2
        `, [gameIdNum, player]);
      } catch (updateError) {
        console.error(`❌ Error updating territory count for player ${player}:`, updateError);
        throw updateError;
      }
    }
    console.log(`🏠 Assigned ${players.length * 3} starting territories`);
    
    // Create remaining empty tiles (8x12 = 96 total tiles)
    let emptyTilesCreated = 0;
    for (let x = 0; x < 12; x++) {
      for (let y = 0; y < 8; y++) {
        if (!assignedTiles.some(tile => tile.x === x && tile.y === y)) {
          try {
            await query(`
              INSERT INTO game_tiles 
                (game_instance_id, x_coord, y_coord) 
              VALUES 
                ($1, $2, $3)
            `, [gameIdNum, x, y]);
            emptyTilesCreated++;
          } catch (emptyTileError) {
            console.error(`❌ Error creating empty tile at (${x}, ${y}):`, emptyTileError);
            // Continue with other tiles instead of throwing
          }
        }
      }
    }
    console.log(`📍 Created ${emptyTilesCreated} empty territories`);
    
    // If game has bots, schedule their actions to start immediately
    if (hasBots) {
      console.log(`🤖 AI bots will begin actions in 5 seconds`);
      // Start AI actions immediately
      setTimeout(() => {
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/games/${gameIdNum}/ai-actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(error => console.error('Failed to start AI actions:', error));
      }, 5000); // Start AI after 5 seconds
    }
    
    console.log(`✅ Game ${gameIdNum} started successfully (96 tiles total)`);
    return true;
  } catch (error) {
    console.error('❌ Error starting game:', error);
    throw error;
  }
} 