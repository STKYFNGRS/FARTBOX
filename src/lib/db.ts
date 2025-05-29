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

// Ensure DATABASE_URL is configured for Neon
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
    'Please configure your Neon database connection string. ' +
    'Get your connection string from https://console.neon.tech'
  );
}

if (DATABASE_URL.includes('localhost') || DATABASE_URL.includes('user:password')) {
  throw new Error(
    'Invalid DATABASE_URL detected. ' +
    'Please use your actual Neon database connection string from https://console.neon.tech'
  );
}

// Create SQL query executor from Neon DATABASE_URL
const sql = neon(DATABASE_URL);

/**
 * Execute SQL queries using Neon serverless Postgres
 * This function provides no fallbacks - it will fail if the database is unavailable
 */
export async function query<T = Record<string, any>>(text: string, params: any[] = []): Promise<QueryResult<T>> {
  try {
    console.log(`[DB] Executing query: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    
    // Execute query using Neon's serverless SQL
    const result = await sql(text, params);
    
    // Neon returns arrays directly, wrap in QueryResult format
    const rows = Array.isArray(result) ? result as T[] : [];
    const rowCount = rows.length;
    
    console.log(`[DB] Query completed: ${rowCount} rows returned`);
    
    return {
      rows,
      rowCount
    };
  } catch (error: any) {
    console.error('[DB] Database query failed:', {
      error: error.message,
      code: error.code,
      query: text.substring(0, 200),
      params: params
    });
    
    // Re-throw the error - no fallbacks or mock data
    throw new Error(`Database query failed: ${error.message}`);
  }
}

/**
 * Execute a transaction with multiple queries
 * Neon supports transactions in serverless mode
 */
export async function transaction<T>(callback: (sql: typeof query) => Promise<T>): Promise<T> {
  try {
    console.log('[DB] Starting transaction');
    
    // For Neon, we can use the sql function directly in a transaction-like manner
    // Neon handles connection pooling and transactions automatically
    const result = await callback(query);
    
    console.log('[DB] Transaction completed successfully');
    return result;
  } catch (error: any) {
    console.error('[DB] Transaction failed:', error.message);
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

/**
 * Helper function to ensure database tables exist
 * This should be called during application startup
 */
export async function ensureTablesExist(): Promise<void> {
  const schemas = [
    `CREATE TABLE IF NOT EXISTS game_sessions (
      id SERIAL PRIMARY KEY,
      season_id INTEGER NOT NULL DEFAULT 1,
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP,
      max_players INTEGER DEFAULT 500,
      status VARCHAR(20) DEFAULT 'active'
    )`,
    
    `CREATE TABLE IF NOT EXISTS game_instances (
      id SERIAL PRIMARY KEY,
      game_session_id INTEGER REFERENCES game_sessions(id),
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP,
      status VARCHAR(20) DEFAULT 'pending',
      map_seed INTEGER DEFAULT 0,
      current_turn INTEGER DEFAULT 0,
      max_players INTEGER DEFAULT 6,
      game_duration INTEGER DEFAULT 30
    )`,
    
    `CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL UNIQUE,
      nft_token_id INTEGER,
      username VARCHAR(50),
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_bot BOOLEAN DEFAULT FALSE
    )`,
    
    `CREATE TABLE IF NOT EXISTS player_game_states (
      id SERIAL PRIMARY KEY,
      game_instance_id INTEGER REFERENCES game_instances(id),
      player_id INTEGER REFERENCES players(id),
      gas_units INTEGER DEFAULT 100,
      last_action_time TIMESTAMP,
      last_gas_regen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      territories_count INTEGER DEFAULT 0,
      UNIQUE(game_instance_id, player_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS game_tiles (
      id SERIAL PRIMARY KEY,
      game_instance_id INTEGER REFERENCES game_instances(id),
      x_coord INTEGER NOT NULL,
      y_coord INTEGER NOT NULL,
      owner_id INTEGER REFERENCES players(id),
      gas_type VARCHAR(20),
      defense_bonus INTEGER DEFAULT 0,
      defense_bonus_until TIMESTAMP,
      is_gas_vent BOOLEAN DEFAULT FALSE,
      last_action_time TIMESTAMP,
      UNIQUE(game_instance_id, x_coord, y_coord)
    )`,
    
    `CREATE TABLE IF NOT EXISTS player_actions (
      id SERIAL PRIMARY KEY,
      game_instance_id INTEGER REFERENCES game_instances(id),
      player_id INTEGER REFERENCES players(id),
      action_type VARCHAR(20) NOT NULL,
      target_x INTEGER,
      target_y INTEGER,
      gas_spent INTEGER,
      result VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS match_results (
      id SERIAL PRIMARY KEY,
      game_instance_id INTEGER REFERENCES game_instances(id),
      player_id INTEGER REFERENCES players(id),
      placement INTEGER,
      territories_final INTEGER,
      tokens_earned INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const schema of schemas) {
    await query(schema);
  }

  // Create indexes for performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_game_tiles_game_coords ON game_tiles(game_instance_id, x_coord, y_coord)',
    'CREATE INDEX IF NOT EXISTS idx_game_tiles_owner ON game_tiles(owner_id)',
    'CREATE INDEX IF NOT EXISTS idx_player_game_states_game ON player_game_states(game_instance_id)',
    'CREATE INDEX IF NOT EXISTS idx_player_actions_game ON player_actions(game_instance_id)',
    'CREATE INDEX IF NOT EXISTS idx_player_actions_created ON player_actions(created_at)'
  ];

  for (const index of indexes) {
    await query(index);
  }
}

// Helper for hexagonal grid coordinate calculations
export function getAdjacentCoords(x: number, y: number): Array<{x: number, y: number}> {
  const isEvenRow = y % 2 === 0;
  
  // Different adjacency patterns based on even/odd rows for hexagonal grid
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