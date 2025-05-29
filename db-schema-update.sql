-- Game management tables
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL DEFAULT 1,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    max_players INTEGER DEFAULT 500,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS game_instances (
    id SERIAL PRIMARY KEY,
    game_session_id INTEGER REFERENCES game_sessions(id),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    map_seed INTEGER DEFAULT 0,
    current_turn INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 6,
    game_duration INTEGER DEFAULT 30
);

-- Player management
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    nft_token_id INTEGER,
    username VARCHAR(50),
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_bot BOOLEAN DEFAULT FALSE
);

-- Player game state
CREATE TABLE IF NOT EXISTS player_game_states (
    id SERIAL PRIMARY KEY,
    game_instance_id INTEGER REFERENCES game_instances(id),
    player_id INTEGER REFERENCES players(id),
    gas_units INTEGER DEFAULT 100,
    last_action_time TIMESTAMP,
    territories_count INTEGER DEFAULT 0
);

-- Game board tiles
CREATE TABLE IF NOT EXISTS game_tiles (
    id SERIAL PRIMARY KEY,
    game_instance_id INTEGER REFERENCES game_instances(id),
    x_coord INTEGER NOT NULL,
    y_coord INTEGER NOT NULL,
    owner_id INTEGER REFERENCES players(id),
    gas_type VARCHAR(20),
    defense_bonus INTEGER DEFAULT 0,
    defense_bonus_until TIMESTAMP,
    is_gas_vent BOOLEAN DEFAULT FALSE,
    last_action_time TIMESTAMP
);

-- Action history
CREATE TABLE IF NOT EXISTS player_actions (
    id SERIAL PRIMARY KEY,
    game_instance_id INTEGER REFERENCES game_instances(id),
    player_id INTEGER REFERENCES players(id),
    action_type VARCHAR(20) NOT NULL,
    target_x INTEGER,
    target_y INTEGER,
    gas_spent INTEGER,
    result VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match results
CREATE TABLE IF NOT EXISTS match_results (
    id SERIAL PRIMARY KEY,
    game_instance_id INTEGER REFERENCES game_instances(id),
    player_id INTEGER REFERENCES players(id),
    placement INTEGER,
    territories_final INTEGER,
    tokens_earned INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_tiles_game_coords ON game_tiles(game_instance_id, x_coord, y_coord);
CREATE INDEX IF NOT EXISTS idx_game_tiles_owner ON game_tiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_player_game_states_game ON player_game_states(game_instance_id);
CREATE INDEX IF NOT EXISTS idx_player_actions_game ON player_actions(game_instance_id);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add is_bot column to players if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' AND column_name = 'is_bot'
    ) THEN
        ALTER TABLE players ADD COLUMN is_bot BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add max_players to game_instances if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_instances' AND column_name = 'max_players'
    ) THEN
        ALTER TABLE game_instances ADD COLUMN max_players INTEGER DEFAULT 6;
    END IF;
    
    -- Add game_duration to game_instances if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_instances' AND column_name = 'game_duration'
    ) THEN
        ALTER TABLE game_instances ADD COLUMN game_duration INTEGER DEFAULT 30;
    END IF;
END $$; 