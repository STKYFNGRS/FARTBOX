import { NextRequest, NextResponse } from 'next/server';
import { query, GameInstance } from '../../../lib/db';
import { startGame } from '../../../lib/game-utils';

// Force dynamic rendering since we use request.url
export const dynamic = 'force-dynamic';

// Get available games
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const currentPlayerId = searchParams.get('playerId'); // Get current player ID if provided
    
    // Allow multiple statuses - show pending and active games in lobby
    const statusFilter = status === 'pending' ? ['pending', 'active'] : [status];
    
    const gamesResult = await query<GameInstance & {player_count: string}>(`
      SELECT 
        gi.id, 
        gi.start_time, 
        gi.status,
        gi.max_players,
        gi.game_duration,
        (
          SELECT COUNT(*) 
          FROM player_game_states 
          WHERE game_instance_id = gi.id
        ) as player_count
      FROM 
        game_instances gi
      WHERE 
        gi.status = ANY($1)
      ORDER BY 
        gi.id ASC
      LIMIT 20
    `, [statusFilter]);
    
    // If current player ID is provided, check which games they're in
    let playerGames = new Set();
    if (currentPlayerId) {
      const playerGamesResult = await query(`
        SELECT game_instance_id 
        FROM player_game_states 
        WHERE player_id = $1
      `, [currentPlayerId]);
      
      playerGames = new Set(playerGamesResult.rows.map(row => row.game_instance_id));
    }
    
    // Add player participation info to each game
    const gamesWithPlayerInfo = gamesResult.rows.map(game => ({
      ...game,
      isPlayerInGame: playerGames.has(parseInt(game.id.toString()))
    }));
    
    return NextResponse.json({ games: gamesWithPlayerInfo });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

// Create a new game
export async function POST(request: NextRequest) {
  try {
    console.log('Game creation API called');
    const body = await request.json();
    console.log('Request body:', body);
    
    const { 
      playerId, 
      maxPlayers = 6, 
      includeBots = false, 
      botCount = 0,
      allowedGasTypes = ['green', 'yellow', 'toxic'],
      gameDuration = 30
    } = body;
    
    console.log('Parsed parameters:', { 
      playerId, 
      maxPlayers, 
      includeBots, 
      botCount,
      gameDuration 
    });
    
    if (!playerId) {
      console.error('Missing playerId in request');
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }
    
    // Validate inputs
    if (maxPlayers < 2 || maxPlayers > 6) {
      console.error('Invalid maxPlayers:', maxPlayers);
      return NextResponse.json(
        { error: 'Max players must be between 2 and 6' },
        { status: 400 }
      );
    }
    
    if (includeBots && (botCount < 1 || botCount >= maxPlayers)) {
      console.error('Invalid botCount:', botCount, 'maxPlayers:', maxPlayers);
      return NextResponse.json(
        { error: 'Bot count must be at least 1 and less than max players' },
        { status: 400 }
      );
    }
    
    console.log('Fetching active game session');
    // Get current active session (or create one if none exists)
    let sessionResult = await query<{id: number, season_id: number, status: string}>(`
      SELECT id FROM game_sessions WHERE status = $1 ORDER BY start_time DESC LIMIT 1
    `, ['active']);
    
    console.log('Session query result:', sessionResult);
    let sessionId;
    
    if (!sessionResult.rows?.length) {
      console.log('No active session found, creating a new one');
      // Create a new session if none exists
      const newSessionResult = await query<{id: number}>(`
        INSERT INTO game_sessions (season_id, status) VALUES ($1, $2) RETURNING id
      `, [1, 'active']); // Season 1
      
      console.log('New session created:', newSessionResult);
      sessionId = newSessionResult.rows[0].id;
    } else {
      sessionId = sessionResult.rows[0].id;
      console.log('Using existing session:', sessionId);
    }
    
    console.log('Creating game instance');
    // Create game instance with custom options
    const gameResult = await query<{id: number}>(`
      INSERT INTO game_instances 
        (game_session_id, status, map_seed, max_players, game_duration) 
       VALUES 
        ($1, $2, $3, $4, $5) 
       RETURNING id
    `, [sessionId, 'pending', Math.floor(Math.random() * 1000000), maxPlayers, gameDuration]);
    
    console.log('Game instance creation result:', gameResult);
    const gameId = gameResult.rows[0].id;
    
    console.log('Adding creator as first player');
    // Add creator as first player
    await query(`
      INSERT INTO player_game_states 
        (game_instance_id, player_id, gas_units, territories_count) 
       VALUES 
        ($1, $2, $3, $4)
    `, [gameId, playerId, 100, 0]); // Start with 0 territories, assigned during game start
    
    // Add bot players if requested
    if (includeBots && botCount > 0) {
      console.log(`Adding ${botCount} bot players`);
      // First, create bot players in the players table if they don't exist
      for (let i = 0; i < botCount; i++) {
        const botName = `AI Player ${i + 1}`;
        const botAddress = `bot-${Math.floor(Math.random() * 10000)}-${i}`;
        
        console.log(`Processing bot ${i+1}: ${botName}`);
        // Check if this bot already exists
        const botResult = await query<{id: number}>(`
          SELECT id FROM players WHERE username = $1 AND wallet_address LIKE 'bot-%'
        `, [botName]);
        
        let botId;
        
        if (botResult.rowCount === 0) {
          console.log('Creating new bot player');
          // Create new bot player
          const newBotResult = await query<{id: number}>(`
            INSERT INTO players (wallet_address, username, last_active, is_bot) 
            VALUES ($1, $2, NOW(), TRUE) 
            RETURNING id
          `, [botAddress, botName]);
          
          botId = newBotResult.rows[0].id;
          console.log('New bot created with ID:', botId);
        } else {
          botId = botResult.rows[0].id;
          console.log('Using existing bot with ID:', botId);
        }
        
        console.log('Adding bot to game');
        // Add bot to game
        await query(`
          INSERT INTO player_game_states 
            (game_instance_id, player_id, gas_units, territories_count) 
          VALUES 
            ($1, $2, $3, $4)
        `, [gameId, botId, 100, 0]);
      }
      
      // If adding bots would meet the player count requirement, auto-start the game
      const totalPlayers = 1 + botCount; // Human creator + bots
      
      if (totalPlayers >= maxPlayers) {
        console.log('Auto-starting game with bots');
        // Start the game with bots
        await startGame(gameId);
        
        console.log('Game started with bots, returning success response');
        return NextResponse.json({ 
          success: true, 
          gameId: String(gameId),
          message: 'Game created and started with AI players',
          gameStarted: true
        });
      }
    }
    
    console.log('Game created successfully, returning response');
    return NextResponse.json({ 
      success: true, 
      gameId: String(gameId),
      message: 'Game created successfully and waiting for players',
      gameStarted: false
    });
  } catch (error) {
    console.error('Error creating game:', error);
    
    // Enhanced error logging with stack trace
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
} 