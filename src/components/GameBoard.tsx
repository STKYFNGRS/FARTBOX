import { useEffect, useState } from 'react';

export interface GameBoardProps {
  isWalletConnected: boolean;
  gameId: string;
  territories: any[];
  playerId?: number;
  selectedAction?: string;
  onTileAction: (x: number, y: number, actionType: string) => void;
  gameState?: {
    gasUnits: number;
    territoriesCount: number;
  };
  actionResult?: {
    success: boolean;
    message: string;
    timestamp: number;
  } | null;
}

interface GridCell {
  owner: string | null;
  color: string;
  power: number;
  isVent: boolean;
  x: number;
  y: number;
}

// Player color mapping with CSS custom properties
const PLAYER_COLORS = {
  1: { 
    bg: '#22c55e', 
    bgOpacity: 'rgba(34, 197, 94, 0.3)', 
    bgOpacityStrong: 'rgba(34, 197, 94, 0.5)',
    border: '#4ade80', 
    text: '#4ade80', 
    name: 'Green' 
  },
  2: { 
    bg: '#eab308', 
    bgOpacity: 'rgba(234, 179, 8, 0.3)', 
    bgOpacityStrong: 'rgba(234, 179, 8, 0.5)',
    border: '#facc15', 
    text: '#facc15', 
    name: 'Yellow' 
  },
  3: { 
    bg: '#8b5cf6', 
    bgOpacity: 'rgba(139, 92, 246, 0.3)', 
    bgOpacityStrong: 'rgba(139, 92, 246, 0.5)',
    border: '#a855f7', 
    text: '#a855f7', 
    name: 'Purple' 
  },
  4: { 
    bg: '#3b82f6', 
    bgOpacity: 'rgba(59, 130, 246, 0.3)', 
    bgOpacityStrong: 'rgba(59, 130, 246, 0.5)',
    border: '#60a5fa', 
    text: '#60a5fa', 
    name: 'Blue' 
  },
  5: { 
    bg: '#ef4444', 
    bgOpacity: 'rgba(239, 68, 68, 0.3)', 
    bgOpacityStrong: 'rgba(239, 68, 68, 0.5)',
    border: '#f87171', 
    text: '#f87171', 
    name: 'Red' 
  },
  6: { 
    bg: '#f97316', 
    bgOpacity: 'rgba(249, 115, 22, 0.3)', 
    bgOpacityStrong: 'rgba(249, 115, 22, 0.5)',
    border: '#fb923c', 
    text: '#fb923c', 
    name: 'Orange' 
  },
};

export default function GameBoard({ 
  isWalletConnected, 
  gameId, 
  territories, 
  playerId, 
  selectedAction,
  onTileAction,
  gameState,
  actionResult 
}: GameBoardProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [mounted, setMounted] = useState(false);
  const [validMoves, setValidMoves] = useState<{x: number, y: number}[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  
  // ALL EFFECT HOOKS
  // Ensure component is mounted to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Fetch player information and recent actions
  useEffect(() => {
    if (!mounted) return;
    
    const fetchGameData = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}`);
        const data = await response.json();
        if (data.players) {
          setPlayers(data.players);
        }
        
        // Fetch recent actions
        const actionsResponse = await fetch(`/api/games/${gameId}/recent-actions`);
        if (actionsResponse.ok) {
          const actionsData = await actionsResponse.json();
          setRecentActions(actionsData.actions || []);
        }
      } catch (error) {
        console.error('Error fetching game data:', error);
      }
    };
    
    fetchGameData();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchGameData, 5000);
    return () => clearInterval(interval);
  }, [gameId, mounted]);
  
  // Calculate valid moves when action is selected
  useEffect(() => {
    if (!mounted || !selectedAction || !playerId || !territories) {
      setValidMoves([]);
      return;
    }
    
    // Find player's owned territories
    const playerTerritories = territories.filter(t => t.owner_id === playerId);
    
    if (playerTerritories.length === 0) {
      setValidMoves([]);
      return;
    }
    
    // Calculate adjacent tiles for valid moves
    const validPositions: {x: number, y: number}[] = [];
    
    playerTerritories.forEach(territory => {
      // Get adjacent coordinates (hexagonal grid)
      const adjacentCoords = getAdjacentCoords(territory.x_coord, territory.y_coord);
      
      adjacentCoords.forEach(coord => {
        // For defend action, only allow on owned territories
        if (selectedAction === 'defend') {
          const isOwnedTile = territories.find(t => 
            t.x_coord === territory.x_coord && 
            t.y_coord === territory.y_coord && 
            t.owner_id === playerId
          );
          if (isOwnedTile && !validPositions.some(p => p.x === territory.x_coord && p.y === territory.y_coord)) {
            validPositions.push({ x: territory.x_coord, y: territory.y_coord });
          }
        } else {
          // For emit and bomb, allow adjacent tiles
          if (!validPositions.some(p => p.x === coord.x && p.y === coord.y)) {
            validPositions.push(coord);
          }
        }
      });
    });
    
    setValidMoves(validPositions);
  }, [mounted, selectedAction, playerId, territories]);
  
  // ALL FUNCTION DEFINITIONS
  // Helper function to get consistent player color based on player ID
  const getPlayerColor = (playerId: number) => {
    // Create a consistent mapping of player ID to color index
    // Sort all unique player IDs first to ensure consistency
    const allPlayerIds = [...new Set(players.map(p => p.id))].sort();
    const playerIndex = allPlayerIds.indexOf(playerId);
    const colorIndex = ((playerIndex % 6) + 1) as keyof typeof PLAYER_COLORS;
    return PLAYER_COLORS[colorIndex] || PLAYER_COLORS[1];
  };
  
  // Helper function for hexagonal adjacency
  const getAdjacentCoords = (x: number, y: number) => {
    const isEvenRow = y % 2 === 0;
    
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
  };
  
  const handleTileClick = (x: number, y: number) => {
    if (!selectedAction || !isWalletConnected || !playerId) return;
    
    // Check if this is a valid move
    const isValidMove = validMoves.some(move => move.x === x && move.y === y);
    if (!isValidMove) return;
    
    onTileAction(x, y, selectedAction);
  };
  
  const getTileDisplay = (territory: any) => {
    if (!territory) return { 
      display: '', 
      style: { 
        backgroundColor: '#1f2937', 
        borderColor: '#4b5563' 
      } 
    };
    
    const isOwned = territory.owner_id !== null;
    const isOwnedByPlayer = territory.owner_id === playerId;
    const isGasVent = territory.is_gas_vent;
    
    let backgroundColor = '#1f2937';
    let borderColor = '#4b5563';
    let textColor = '#9ca3af';
    let display = '';
    
    // Gas vents have special styling
    if (isGasVent) {
      backgroundColor = isOwned ? '#dc2626' : '#991b1b'; // Red for gas vents
      borderColor = '#ef4444';
      textColor = '#fecaca';
      display = '⛽'; // Gas pump emoji for gas vents
      
      if (isOwned && territory.owner_id) {
        const playerColor = getPlayerColor(territory.owner_id);
        if (playerColor) {
          // Mix player color with gas vent red
          backgroundColor = `linear-gradient(45deg, ${playerColor.bg}, #dc2626)`;
          borderColor = playerColor.border;
        }
        
        if (isOwnedByPlayer) {
          borderColor = '#10b981'; // Green border for player's gas vents
          textColor = '#ffffff';
        }
      }
    } else if (isOwned && territory.owner_id) {
      const playerColor = getPlayerColor(territory.owner_id);
      if (playerColor) {
        backgroundColor = playerColor.bgOpacity;
        borderColor = playerColor.border;
        textColor = playerColor.text;
        
        // Add extra highlighting for current player's territories
        if (isOwnedByPlayer) {
          borderColor = '#10b981';
          backgroundColor = playerColor.bg;
        }
      }
      
      // Show defense bonus if active
      if (territory.defense_bonus && territory.defense_bonus > 0) {
        display = '🛡️';
      } else {
        // Show gas type indicator
        display = territory.gas_type === 'green' ? '🟢' : 
                 territory.gas_type === 'yellow' ? '🟡' : 
                 territory.gas_type === 'toxic' ? '🟣' : '●';
      }
    }
    
    return {
      display,
      style: {
        background: backgroundColor,
        borderColor,
        color: textColor
      }
    };
  };
  
  // Create grid of territories (8x12 hexagonal grid)
  const renderGameGrid = () => {
    const rows = 8;
    const cols = 12;
    const grid = [];
    
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        const territory = territories.find(t => t.x_coord === x && t.y_coord === y);
        const isValidMove = validMoves.some(move => move.x === x && move.y === y);
        const { display, style } = getTileDisplay(territory);
        
        row.push(
          <div
            key={`${x}-${y}`}
            className={`
              hex-tile w-12 h-12 flex items-center justify-center rounded-lg border-2 cursor-pointer
              transition-all duration-200 font-bold text-sm
              ${isValidMove ? 'ring-2 ring-yellow-400 ring-opacity-70 animate-pulse' : ''}
              hover:scale-105 hover:brightness-110
            `}
            style={style}
            onClick={() => handleTileClick(x, y)}
            title={`Position: ${x},${y}${territory?.owner_id ? ` | Owner: Player ${territory.owner_id}` : ''}`}
          >
            {display}
          </div>
        );
      }
      grid.push(
        <div key={y} className="flex justify-center gap-1">
          {row}
        </div>
      );
    }
    
    return grid;
  };
  
  // NOW SAFE FOR CONDITIONAL RETURNS
  if (!mounted) {
    // Return basic loading state during SSR
    return (
      <div className="flex-1 bg-black/50 border-2 border-green-500/30 rounded-lg p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-green-400 font-bold">Loading game board...</div>
        </div>
      </div>
    );
  }
  
  if (!isWalletConnected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-300 mb-4">Connect your wallet to join the game</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-gray-900/50 relative">
      {/* Player Legend */}
      <div className="bg-black/30 border-b border-green-500/20 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-green-400">Players</h3>
          <div className="text-xs text-gray-400">
            Game updates every 3 seconds
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          {players.map((player, index) => {
            const playerColor = getPlayerColor(player.id);
            const isCurrentPlayer = player.id === playerId;
            const territoriesOwned = territories.filter(t => t.owner_id === player.id).length;
            
            return (
              <div 
                key={player.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  isCurrentPlayer 
                    ? 'bg-green-500/20 border-green-400/50' 
                    : 'bg-black/20 border-gray-600/50'
                }`}
              >
                <div 
                  className={`w-6 h-6 rounded-full border-2`}
                  style={{
                    backgroundColor: playerColor?.bg,
                    borderColor: playerColor?.border
                  }}
                ></div>
                <div className="flex flex-col">
                  <span 
                    className="font-semibold text-sm"
                    style={{ color: playerColor?.text }}
                  >
                    {playerColor?.name} {player.username ? `(${player.username})` : ''}
                    {isCurrentPlayer && ' (You)'}
                    {player.is_bot && ' (AI)'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {territoriesOwned} territories • {player.gas_units || 100} gas
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Recent Actions Feed */}
      {recentActions.length > 0 && (
        <div className="bg-black/20 border-b border-green-500/10 p-3">
          <h4 className="text-sm font-semibold text-green-400 mb-2">Recent Actions</h4>
          <div className="text-xs text-gray-300 space-y-1 max-h-20 overflow-y-auto">
            {recentActions.slice(0, 3).map((action, index) => {
              const player = players.find(p => p.id === action.player_id);
              const playerColor = action.player_id ? getPlayerColor(action.player_id) : PLAYER_COLORS[1];
              const timeAgo = Math.floor((Date.now() - new Date(action.created_at).getTime()) / 1000);
              const isAI = player?.is_bot;
              
              return (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${isAI ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: playerColor?.bg }}
                  ></div>
                  <span style={{ color: playerColor?.text }}>
                    {isAI ? '🤖 ' : ''}{player?.username || `Player ${action.player_id}`}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {action.action_type === 'emit' ? '💨' : 
                     action.action_type === 'bomb' ? '💥' : '🛡️'} 
                    {timeAgo}s ago
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Action Result Display */}
      {actionResult && (
        <div className={`
          fixed top-4 right-4 p-4 rounded-lg border z-50
          ${actionResult.success 
            ? 'bg-green-500/20 border-green-500/50 text-green-400' 
            : 'bg-red-500/20 border-red-500/50 text-red-400'
          }
        `}>
          <div className="flex items-center gap-2">
            {actionResult.success ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            )}
            <span className="font-semibold">{actionResult.message}</span>
          </div>
        </div>
      )}
      
      {/* Game Instructions */}
      {selectedAction && validMoves.length > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 p-3 m-4 rounded-lg">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span className="font-semibold">
              {selectedAction === 'emit' && 'Click a highlighted tile adjacent to your territories to release gas'}
              {selectedAction === 'bomb' && 'Click a highlighted tile to launch a gas bomb attack'}
              {selectedAction === 'defend' && 'Click one of your territories to boost its defenses'}
            </span>
          </div>
        </div>
      )}
      
      {/* Game Grid */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="space-y-1 max-w-4xl">
          {renderGameGrid()}
        </div>
      </div>
      
      {/* Game Legend */}
      <div className="bg-black/30 border-t border-green-500/20 p-4">
        <div className="flex justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-800 border border-gray-600 rounded"></div>
            <span className="text-gray-400">Empty Territory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500/30 border border-green-400 rounded"></div>
            <span className="text-green-400">Your Territory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded-full"></div>
            <span className="text-red-400">Gas Vent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400/50 border-2 border-yellow-400 rounded animate-pulse"></div>
            <span className="text-yellow-400">Valid Move</span>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-green-400 mb-3">🎯 Game Objectives</h3>
        <div className="space-y-2 text-sm">
          <div className="text-green-300">
            <strong>🎯 Victory Condition:</strong> Control 40+ territories to win! (42% of the map)
          </div>
          <div className="text-blue-300">
            <strong>⚡ Turn-Based System:</strong> 
            <ul className="ml-4 mt-1 space-y-1 list-disc">
              <li>Simple 5-second cooldown between actions (spam prevention)</li>
              <li>No complex turn timers - play at your own pace</li>
              <li>Each action costs gas: Emit (10), Bomb (25), Defend (15)</li>
            </ul>
          </div>
          <div className="text-yellow-300">
            <strong>💨 Gas System:</strong> 
            <ul className="ml-4 mt-1 space-y-1 list-disc">
              <li>+3 gas every 30 seconds (base regeneration)</li>
              <li>Control <span className="text-red-400">⛽</span> gas vents for +2 extra gas per vent per 30s</li>
              <li>Gas vents also give +5 gas bonus per vent after each action</li>
            </ul>
          </div>
          <div className="text-purple-300">
            <strong>🎮 Strategy Tips:</strong>
            <ul className="ml-4 mt-1 space-y-1 list-disc">
              <li>Prioritize gas vents for resource advantage</li>
              <li>Random map each game - adapt your strategy!</li>
              <li>Use defense to protect key positions</li>
              <li>Watch for 🤖 AI player movements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}