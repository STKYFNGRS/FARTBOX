import { query, getAdjacentCoords } from './db';

// Helper function to start a game
export async function startGame(gameId: number | string) {
  const gameIdNum = typeof gameId === 'string' ? parseInt(gameId) : gameId;
  
  console.log(`Starting game: ${gameIdNum}`);
  
  try {
    console.log('Updating game status to active');
    // Update game status to active
    await query(`
      UPDATE game_instances 
      SET status = 'active', start_time = NOW() 
      WHERE id = $1
    `, [gameIdNum]);
    
    console.log('Getting players in the game');
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
    
    console.log('Players in game:', playersResult);
    
    const players = playersResult.rows.map((row: any) => row.player_id);
    const hasBots = playersResult.rows.some((row: any) => row.is_bot);
    
    console.log(`Found ${players.length} players, includes bots: ${hasBots}`);
    
    // Initialize map with gas vents (3 vents)
    const mapSeed = Math.floor(Math.random() * 1000000);
    console.log(`Map seed: ${mapSeed}`);
    
    // Fix random function - use proper seeded random
    let seedCounter = 0;
    const seededRandom = (max: number) => {
      seedCounter++;
      const x = Math.sin(mapSeed + seedCounter) * 10000;
      return Math.floor((x - Math.floor(x)) * max);
    };
    
    console.log('Creating gas vents');
    // Create gas vents
    const gasVents: Array<{x: number, y: number}> = [];
    for (let i = 0; i < 3; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = seededRandom(7);
        y = seededRandom(7);
        attempts++;
        if (attempts > 50) {
          // Fallback to ensure we don't get stuck
          x = i * 2;
          y = i * 2;
          break;
        }
      } while (gasVents.some(vent => vent.x === x && vent.y === y));
      
      gasVents.push({ x, y });
      console.log(`Creating gas vent at (${x}, ${y})`);
      
      try {
        await query(`
          INSERT INTO game_tiles 
            (game_instance_id, x_coord, y_coord, is_gas_vent) 
          VALUES 
            ($1, $2, $3, $4)
        `, [gameIdNum, x, y, true]);
        console.log(`Gas vent ${i + 1} created successfully`);
      } catch (ventError) {
        console.error(`Error creating gas vent ${i + 1}:`, ventError);
        throw ventError;
      }
    }
    
    console.log('Assigning initial territories to players');
    // Assign initial territories to players (3 per player)
    const assignedTiles = [...gasVents];
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const gasType = ['green', 'yellow', 'toxic'][i % 3]; // Distribute gas types evenly
      console.log(`Assigning territories to player ${player} with ${gasType} gas type`);
      
      for (let j = 0; j < 3; j++) {
        let x: number, y: number;
        let tries = 0;
        do {
          x = seededRandom(7);
          y = seededRandom(7);
          tries++;
          if (tries > 50) {
            // Fallback to ensure we don't get stuck
            x = (i * 3 + j) % 7;
            y = Math.floor((i * 3 + j) / 7);
            break;
          }
        } while (assignedTiles.some(tile => tile.x === x && tile.y === y));
        
        assignedTiles.push({ x, y });
        console.log(`Creating territory for player ${player} at (${x}, ${y})`);
        
        try {
          // Create territory for player
          await query(`
            INSERT INTO game_tiles 
              (game_instance_id, x_coord, y_coord, owner_id, gas_type) 
            VALUES 
              ($1, $2, $3, $4, $5)
          `, [gameIdNum, x, y, player, gasType]);
          console.log(`Territory ${j + 1} for player ${player} created successfully`);
        } catch (territoryError) {
          console.error(`Error creating territory for player ${player}:`, territoryError);
          throw territoryError;
        }
      }
      
      console.log(`Updating territory count for player ${player}`);
      try {
        // Update player's territory count
        await query(`
          UPDATE player_game_states 
          SET territories_count = 3 
          WHERE game_instance_id = $1 AND player_id = $2
        `, [gameIdNum, player]);
        console.log(`Territory count updated for player ${player}`);
      } catch (updateError) {
        console.error(`Error updating territory count for player ${player}:`, updateError);
        throw updateError;
      }
    }
    
    console.log('Creating remaining empty tiles');
    // Create remaining empty tiles
    let emptyTilesCreated = 0;
    for (let x = 0; x < 7; x++) {
      for (let y = 0; y < 7; y++) {
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
            console.error(`Error creating empty tile at (${x}, ${y}):`, emptyTileError);
            // Continue with other tiles instead of throwing
          }
        }
      }
    }
    console.log(`Created ${emptyTilesCreated} empty tiles`);
    
    // If game has bots, schedule their actions
    if (hasBots) {
      console.log(`Game ${gameIdNum} has bots - will schedule bot actions`);
      // In a real implementation, you would set up a system to have bots take actions
      // This could be a serverless cron job, a worker, or a scheduled task
    }
    
    console.log(`Game ${gameIdNum} started successfully with ${assignedTiles.length} total tiles`);
    return true;
  } catch (error) {
    console.error('Error starting game:', error);
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    // Set game status back to pending if there was an error
    try {
      await query(`
        UPDATE game_instances 
        SET status = 'pending' 
        WHERE id = $1
      `, [gameIdNum]);
      console.log(`Game ${gameIdNum} status reverted to pending due to initialization error`);
    } catch (revertError) {
      console.error('Error reverting game status:', revertError);
    }
    
    return false;
  }
} 