import { neon } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

// Database response types
interface PlayerStats {
  token_id: number;
  owner_address: string;
  wins: number;
  experience: number;
  level: number;
  social_score: number;
  last_updated: Date;
}

interface Season {
  season_id: number;
  start_time: Date;
  end_time: Date | null;
  map_cid: string;
  results_cid: string | null;
  player_count: number;
  status: string;
}

// Get the database URL from the environment variables
const DATABASE_URL = process.env.NEON_DATABASE_URL;

// Initialize the Postgres client
let sql: ReturnType<typeof neon> | undefined;
let pool: Pool | undefined;

// Initialize database connection
function initializeConnection(): void {
  if (!DATABASE_URL) {
    console.error('Missing NEON_DATABASE_URL environment variable');
    return;
  }
  
  // Create a SQL query function
  sql = neon(DATABASE_URL);
  
  // Create a connection pool for more complex operations
  pool = new Pool({ connectionString: DATABASE_URL });
}

// Initialize connection on module load
initializeConnection();

/**
 * Initialize database tables if they don't exist
 */
export async function initializeTables(): Promise<void> {
  if (!sql) {
    throw new Error('Database not initialized');
  }

  try {
    // Create player_stats table to mirror on-chain data for quicker queries
    await sql`
      CREATE TABLE IF NOT EXISTS player_stats (
        token_id INTEGER PRIMARY KEY,
        owner_address TEXT NOT NULL,
        wins INTEGER NOT NULL DEFAULT 0,
        experience INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        social_score INTEGER NOT NULL DEFAULT 0,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // Create seasons table to track season metadata
    await sql`
      CREATE TABLE IF NOT EXISTS seasons (
        season_id INTEGER PRIMARY KEY,
        start_time TIMESTAMP NOT NULL DEFAULT NOW(),
        end_time TIMESTAMP,
        map_cid TEXT NOT NULL,
        results_cid TEXT,
        player_count INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
      )
    `;

    // Create matches table for overflow lobbies
    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        match_id SERIAL PRIMARY KEY,
        season_id INTEGER NOT NULL REFERENCES seasons(season_id),
        map_id INTEGER NOT NULL,
        map_cid TEXT NOT NULL,
        player_count INTEGER NOT NULL,
        winner_token_id INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // Create player_history table for historical performance tracking
    await sql`
      CREATE TABLE IF NOT EXISTS player_history (
        id SERIAL PRIMARY KEY,
        token_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        match_id INTEGER REFERENCES matches(match_id),
        placement INTEGER,
        xp_gained INTEGER,
        survived_turns INTEGER,
        eliminations INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}

/**
 * Get player stats from the database
 * @param tokenId The token ID to get stats for
 */
export async function getPlayerStats(tokenId: number): Promise<PlayerStats | null> {
  if (!sql) {
    throw new Error('Database not initialized');
  }

  try {
    const result = await sql`
      SELECT * FROM player_stats WHERE token_id = ${tokenId}
    `;
    
    // Check if result exists and has at least one row
    if (result && Array.isArray(result) && result.length > 0) {
      return result[0] as PlayerStats;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting player stats for token ${tokenId}:`, error);
    throw error;
  }
}

/**
 * Update player stats in the database
 * @param tokenId The token ID to update
 * @param stats The stats to update
 */
export async function updatePlayerStats(
  tokenId: number, 
  stats: {
    ownerAddress?: string;
    wins?: number;
    experience?: number;
    level?: number;
    socialScore?: number;
  }
): Promise<PlayerStats | null> {
  if (!pool) {
    throw new Error('Database not initialized');
  }

  try {
    // Building dynamic update fields
    const updates: string[] = [];
    const values: unknown[] = [tokenId];
    let paramIndex = 2;

    if (stats.ownerAddress !== undefined) {
      updates.push(`owner_address = $${paramIndex++}`);
      values.push(stats.ownerAddress);
    }
    
    if (stats.wins !== undefined) {
      updates.push(`wins = $${paramIndex++}`);
      values.push(stats.wins);
    }
    
    if (stats.experience !== undefined) {
      updates.push(`experience = $${paramIndex++}`);
      values.push(stats.experience);
    }
    
    if (stats.level !== undefined) {
      updates.push(`level = $${paramIndex++}`);
      values.push(stats.level);
    }
    
    if (stats.socialScore !== undefined) {
      updates.push(`social_score = $${paramIndex++}`);
      values.push(stats.socialScore);
    }

    // Always update last_updated timestamp
    updates.push(`last_updated = NOW()`);

    // If no fields to update, return
    if (updates.length === 0) return null;

    // Build the query
    const result = await pool.query(
      `
      INSERT INTO player_stats (token_id, owner_address, wins, experience, level, social_score, last_updated)
      VALUES ($1, COALESCE((SELECT owner_address FROM player_stats WHERE token_id = $1), ''), 
              COALESCE((SELECT wins FROM player_stats WHERE token_id = $1), 0), 
              COALESCE((SELECT experience FROM player_stats WHERE token_id = $1), 0),
              COALESCE((SELECT level FROM player_stats WHERE token_id = $1), 1),
              COALESCE((SELECT social_score FROM player_stats WHERE token_id = $1), 0),
              NOW())
      ON CONFLICT (token_id) 
      DO UPDATE SET ${updates.join(', ')}
      RETURNING *
      `,
      values
    );

    if (result && result.rows && result.rows.length > 0) {
      return result.rows[0] as PlayerStats;
    }
    
    return null;
  } catch (error) {
    console.error(`Error updating player stats for token ${tokenId}:`, error);
    throw error;
  }
}

/**
 * Get top players for leaderboard
 * @param limit Number of players to get
 * @param offset Offset for pagination
 */
export async function getLeaderboard(limit = 100, offset = 0): Promise<PlayerStats[]> {
  if (!sql) {
    throw new Error('Database not initialized');
  }

  try {
    const result = await sql`
      SELECT token_id, owner_address, wins, level, experience, social_score
      FROM player_stats
      ORDER BY wins DESC, experience DESC, social_score DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    // Ensure we return an array, even if empty
    return Array.isArray(result) ? result as PlayerStats[] : [];
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
}

/**
 * Create a new season
 * @param seasonId The season ID
 * @param mapCid The IPFS CID of the map
 * @param playerCount Number of players in the season
 */
export async function createSeason(seasonId: number, mapCid: string, playerCount: number): Promise<Season | null> {
  if (!sql) {
    throw new Error('Database not initialized');
  }

  try {
    const result = await sql`
      INSERT INTO seasons (season_id, map_cid, player_count)
      VALUES (${seasonId}, ${mapCid}, ${playerCount})
      RETURNING *
    `;
    
    // Check if result exists and has at least one row
    if (result && Array.isArray(result) && result.length > 0) {
      return result[0] as Season;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating season:', error);
    throw error;
  }
}

/**
 * End a season
 * @param seasonId The season ID to end
 * @param resultsCid The IPFS CID of the results
 */
export async function endSeason(seasonId: number, resultsCid: string): Promise<Season | null> {
  if (!sql) {
    throw new Error('Database not initialized');
  }

  try {
    const result = await sql`
      UPDATE seasons
      SET end_time = NOW(), results_cid = ${resultsCid}, status = 'completed'
      WHERE season_id = ${seasonId} AND status = 'active'
      RETURNING *
    `;
    
    // Check if result exists and has at least one row
    if (result && Array.isArray(result) && result.length > 0) {
      return result[0] as Season;
    }
    
    return null;
  } catch (error) {
    console.error(`Error ending season ${seasonId}:`, error);
    throw error;
  }
}

// Make sure the database is initialized before exporting
if (!sql || !pool) {
  initializeConnection();
}

// Named exports
export const neonDb = {
  initializeTables,
  getPlayerStats,
  updatePlayerStats,
  getLeaderboard,
  createSeason,
  endSeason
};

// Default export with a name
export default neonDb; 