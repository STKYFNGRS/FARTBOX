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
    
    // Initialize map with proper 8x12 grid and strategic gas vents
    const mapSeed = Math.floor(Math.random() * 1000000);
    console.log(`Map seed: ${mapSeed}`);
    
    // Fix random function - use proper seeded random
    let seedCounter = 0;
    const seededRandom = (max: number) => {
      seedCounter++;
      const x = Math.sin(mapSeed + seedCounter) * 10000;
      return Math.floor((x - Math.floor(x)) * max);
    };
    
    console.log('Creating strategic gas vents (5 vents for 8x12 map)');
    // Create 5 gas vents strategically placed for 8x12 map
    const gasVents: Array<{x: number, y: number}> = [];
    const ventPositions = [
      { x: 2, y: 2 },   // Top-left quadrant
      { x: 9, y: 2 },   // Top-right quadrant  
      { x: 5, y: 4 },   // Center
      { x: 2, y: 6 },   // Bottom-left quadrant
      { x: 9, y: 6 }    // Bottom-right quadrant
    ];
    
    for (let i = 0; i < 5; i++) {
      const vent = ventPositions[i];
      gasVents.push(vent);
      console.log(`Creating gas vent at (${vent.x}, ${vent.y})`);
      
      try {
        await query(`
          INSERT INTO game_tiles 
            (game_instance_id, x_coord, y_coord, is_gas_vent) 
          VALUES 
            ($1, $2, $3, $4)
        `, [gameIdNum, vent.x, vent.y, true]);
        console.log(`Gas vent ${i + 1} created successfully`);
      } catch (ventError) {
        console.error(`Error creating gas vent ${i + 1}:`, ventError);
        throw ventError;
      }
    }
    
    console.log('Assigning initial territories to players (3 per player)');
    // Assign initial territories to players - distributed across the 8x12 map
    const assignedTiles = [...gasVents];
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const gasType = ['green', 'yellow', 'toxic'][i % 3]; // Distribute gas types evenly
      console.log(`Assigning territories to player ${player} with ${gasType} gas type`);
      
      // Give each player 3 starting territories spread out
      const startPositions = [
        // Distribute players around the edges
        { x: 1 + (i * 2) % 10, y: 1 },
        { x: 1 + (i * 2) % 10, y: 3 },
        { x: 1 + (i * 2) % 10, y: 5 }
      ];
      
      for (let j = 0; j < 3; j++) {
        let x = startPositions[j].x;
        let y = startPositions[j].y;
        
        // Make sure we don't overlap with gas vents or other assigned tiles
        let tries = 0;
        while (assignedTiles.some(tile => tile.x === x && tile.y === y) && tries < 20) {
          x = seededRandom(12);
          y = seededRandom(8);
          tries++;
        }
        
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
    
    console.log('Creating remaining empty tiles for 8x12 grid');
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
            console.error(`Error creating empty tile at (${x}, ${y}):`, emptyTileError);
            // Continue with other tiles instead of throwing
          }
        }
      }
    }
    console.log(`Created ${emptyTilesCreated} empty tiles`);
    
    // If game has bots, schedule their actions to start immediately
    if (hasBots) {
      console.log(`Game ${gameIdNum} has bots - will schedule bot actions`);
      // Start AI actions immediately
      setTimeout(() => {
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/games/${gameIdNum}/ai-actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(error => console.error('Failed to start AI actions:', error));
      }, 5000); // Start AI after 5 seconds
    }
    
    console.log(`Game ${gameIdNum} started successfully with ${assignedTiles.length} total tiles (${96 - emptyTilesCreated} assigned, ${emptyTilesCreated} empty)`);
    return true;
  } catch (error) {
    console.error('Error starting game:', error);
    throw error;
  }
} 