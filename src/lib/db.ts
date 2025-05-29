import { neon } from '@neondatabase/serverless';

// Define types for database records
export type GameInstance = {
  id: number;
  game_session_id: number;
  start_time: Date | string;
  end_time?: Date | string | null;
  status: 'pending' | 'active' | 'completed';
  map_seed: number;
  current_turn: number;
};

export type PlayerGameState = {
  id: number;
  game_instance_id: number;
  player_id: number;
  gas_units: number;
  last_action_time?: Date | string | null;
  territories_count: number;
};

export type GameTile = {
  id: number;
  game_instance_id: number;
  x_coord: number;
  y_coord: number;
  owner_id?: number | null;
  gas_type?: string | null;
  defense_bonus: number;
  defense_bonus_until?: Date | string | null;
  is_gas_vent: boolean;
  last_action_time?: Date | string | null;
};

export type Player = {
  id: number;
  wallet_address: string;
  nft_token_id?: number | null;
  username?: string | null;
  last_active: Date | string;
};

// Define QueryResult type that matches the shape we return
export type QueryResult<T = Record<string, any>> = {
  rows: T[];
  rowCount: number;
};

// Check if we have a real database connection
const isDatabaseConfigured = process.env.DATABASE_URL && 
  process.env.DATABASE_URL !== 'postgresql://user:password@localhost:5432/fartbox';

// Create SQL query executor from DATABASE_URL
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/fartbox';

let sql: any = null;
if (isDatabaseConfigured) {
  sql = neon(connectionString);
}

// Helper function to execute SQL queries with params
export async function query<T = Record<string, any>>(text: string, params: any[] = []): Promise<QueryResult<T>> {
  // If no database is configured, return mock data
  if (!isDatabaseConfigured || !sql) {
    console.warn('DATABASE_URL not configured, using mock data');
    return mockQueryResults<T>(text, params);
  }

  try {
    // Using direct SQL query with proper error handling
    const result = await sql(text, params);
    
    // Add a rows property to match pg client format
    return {
      rows: Array.isArray(result) ? result as T[] : [],
      rowCount: Array.isArray(result) ? result.length : 0
    };
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    
    // Fall back to mock data if database fails
    console.warn('Database query failed, falling back to mock data');
    return mockQueryResults<T>(text, params);
  }
}

// Enhanced mock data for development
function mockQueryResults<T>(text: string, params: any[] = []): QueryResult<T> {
  const lowerText = text.toLowerCase();
  
  // Mock game instances
  if (lowerText.includes('select') && lowerText.includes('game_instances')) {
    const mockGames = [
      {
        id: 1,
        game_session_id: 1,
        start_time: new Date().toISOString(),
        status: 'active',
        map_seed: 12345,
        current_turn: 5,
        max_players: 6,
        player_count: '4'
      },
      {
        id: 2,
        game_session_id: 1,
        start_time: new Date(Date.now() - 300000).toISOString(),
        status: 'pending',
        map_seed: 67890,
        current_turn: 0,
        max_players: 6,
        player_count: '2'
      }
    ];
    
    return {
      rows: mockGames as unknown as T[],
      rowCount: mockGames.length
    };
  }
  
  // Mock game sessions
  if (lowerText.includes('select') && lowerText.includes('game_sessions')) {
    return {
      rows: [{ id: 1, season_id: 1, status: 'active' }] as unknown as T[],
      rowCount: 1
    };
  }
  
  // Mock players
  if (lowerText.includes('select') && lowerText.includes('players')) {
    const mockPlayers = [
      {
        id: 1,
        wallet_address: '0x1234567890123456789012345678901234567890',
        username: 'Player 1',
        gas_units: 85,
        territories_count: 3
      },
      {
        id: 2,
        wallet_address: '0x0987654321098765432109876543210987654321',
        username: 'Player 2',
        gas_units: 70,
        territories_count: 2
      }
    ];
    
    return {
      rows: mockPlayers as unknown as T[],
      rowCount: mockPlayers.length
    };
  }
  
  // Mock game tiles/territories
  if (lowerText.includes('select') && lowerText.includes('game_tiles')) {
    const mockTiles = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 12; x++) {
        mockTiles.push({
          id: y * 12 + x + 1,
          game_instance_id: 1,
          x_coord: x,
          y_coord: y,
          owner_id: Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : 2) : null,
          gas_type: Math.random() > 0.5 ? 'green' : (Math.random() > 0.5 ? 'yellow' : 'toxic'),
          defense_bonus: 0,
          is_gas_vent: Math.random() > 0.9
        });
      }
    }
    
    return {
      rows: mockTiles as unknown as T[],
      rowCount: mockTiles.length
    };
  }
  
  // Mock inserts
  if (lowerText.includes('insert')) {
    return {
      rows: [{ id: Math.floor(Math.random() * 1000) + 1 }] as unknown as T[],
      rowCount: 1
    };
  }
  
  // Mock updates
  if (lowerText.includes('update')) {
    return {
      rows: [] as T[],
      rowCount: 1
    };
  }
  
  // Default mock response
  return {
    rows: [] as T[],
    rowCount: 0
  };
}

// Helper for hexagonal grid coordinate calculations
export function getAdjacentCoords(x: number, y: number): Array<{x: number, y: number}> {
  const isEvenRow = y % 2 === 0;
  
  // Different adjacency patterns based on even/odd rows
  if (isEvenRow) {
    return [
      { x: x-1, y: y },    // left
      { x: x+1, y: y },    // right
      { x: x, y: y-1 },    // top-left
      { x: x+1, y: y-1 },  // top-right
      { x: x, y: y+1 },    // bottom-left
      { x: x+1, y: y+1 }   // bottom-right
    ];
  } else {
    return [
      { x: x-1, y: y },    // left
      { x: x+1, y: y },    // right
      { x: x-1, y: y-1 },  // top-left
      { x: x, y: y-1 },    // top-right
      { x: x-1, y: y+1 },  // bottom-left
      { x: x, y: y+1 }     // bottom-right
    ];
  }
} 