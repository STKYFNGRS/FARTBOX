'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';

import GameHeader from '../../../components/GameHeader';
import Sidebar from '../../../components/Sidebar';
import GameBoard from '../../../components/GameBoard';
import GameControls from '../../../components/GameControls';

// Define the active tab type if not already globally available
export type ActiveTab = 'leaderboard' | 'profile' | 'chat' | 'help';

interface GameData {
  id: string;
  name: string;
  createdBy: string;
  players: any[];
  territories: any[];
  status: 'pending' | 'active' | 'completed';
  game: any;
}

interface GameState {
  gasUnits: number;
  lastActionTime?: string;
  territoriesCount: number;
}

export default function GamePage() {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = params.id as string;
  
  // ALL STATE HOOKS
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('help');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [gasClouds, setGasClouds] = useState<{ x: number; y: number; size: number; color: string }[]>([]);
  const [actionResult, setActionResult] = useState<{success: boolean, message: string, timestamp: number} | null>(null);
  
  // Check if in spectate mode
  const isSpectating = searchParams?.get('spectate') === 'true';
  
  // ALL CALLBACK HOOKS
  const authenticatePlayer = useCallback(async () => {
    if (!address) return;
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      const data = await response.json();
      if (data.player) {
        setPlayerId(data.player.id);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  }, [address]);
  
  const fetchGameData = useCallback(async () => {
    if (!gameId) return;
    
    try {
      console.log(`Fetching data for game: ${gameId}`);
      
      const response = await fetch(`/api/games/${gameId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching game data: ${response.status}`, errorText);
        throw new Error(`Failed to fetch game data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Game data loaded:', data);
      
      setGameData({
        id: gameId,
        name: `Game ${gameId}`,
        createdBy: data.game?.creator_id || 'Unknown',
        players: data.players || [],
        territories: data.territories || [],
        status: data.game?.status || 'pending',
        game: data.game
      });
      
      // Find player's game state (only if not spectating and player is authenticated)
      if (playerId && data.players && !isSpectating) {
        const playerData = data.players.find((p: any) => p.id === playerId);
        if (playerData) {
          setGameState({
            gasUnits: playerData.gas_units || 100,
            lastActionTime: playerData.last_action_time,
            territoriesCount: playerData.territories_count || 0
          });
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading game data:', error);
      setError('Failed to load game data');
      setLoading(false);
    }
  }, [gameId, playerId, isSpectating]);
  
  const refreshGameState = useCallback(async () => {
    await fetchGameData();
  }, [fetchGameData]);
  
  const handleTileAction = useCallback(async (x: number, y: number, actionType: string) => {
    if (!playerId || !gameId) return;
    
    const actionCosts = {
      emit: 10,
      bomb: 25,
      defend: 15
    };
    
    const cost = actionCosts[actionType as keyof typeof actionCosts] || 10;
    
    try {
      const response = await fetch(`/api/games/${gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          actionType,
          targetX: x,
          targetY: y,
          gasSpent: cost
        })
      });
      
      const result = await response.json();
      
      // Show action result
      setActionResult({
        success: result.success,
        message: result.message || (result.success ? 'Action successful!' : result.error || 'Action failed'),
        timestamp: Date.now()
      });
      
      if (result.success) {
        // Clear selected action
        setSelectedAction(null);
        // Refresh game state
        await refreshGameState();
      } else {
        console.error('Action failed:', result.error);
      }
    } catch (error) {
      console.error('Action execution error:', error);
      setActionResult({
        success: false,
        message: 'Network error - please try again',
        timestamp: Date.now()
      });
    }
  }, [playerId, gameId, refreshGameState]);
  
  // Calculate time remaining if game has duration
  const getTimeRemaining = () => {
    if (!gameData?.game?.start_time || !gameData?.game?.game_duration) {
      return null;
    }
    
    const startTime = new Date(gameData.game.start_time).getTime();
    const duration = gameData.game.game_duration * 60 * 1000; // Convert minutes to milliseconds
    const endTime = startTime + duration;
    const now = Date.now();
    const remaining = endTime - now;
    
    if (remaining <= 0) {
      // Game time expired - end the game
      if (gameData.game.status === 'active') {
        fetch(`/api/games/${gameId}/end-game`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'time_expired' })
        }).catch(error => console.error('Error ending game:', error));
      }
      return 'GAME OVER';
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  // ALL EFFECT HOOKS
  // Ensure component is mounted to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    // Redirect to home if not connected and not spectating
    if (!isConnected && !isSpectating) {
      router.push('/');
      return;
    }
    
    // Authenticate player if connected (but not required for spectating)
    if (isConnected && address) {
      authenticatePlayer();
    }
    
    // Generate background gas clouds
    const clouds = Array.from({ length: 5 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 20 + Math.random() * 30,
      color: Math.random() > 0.5 ? 'green' : 'yellow'
    }));
    setGasClouds(clouds);
  }, [isConnected, router, authenticatePlayer, isSpectating, address]);
  
  useEffect(() => {
    // Fetch game data immediately for spectators, or after authentication for players
    if (isSpectating || playerId) {
      fetchGameData();
    }
  }, [playerId, fetchGameData, isSpectating]);
  
  // Set up real-time polling for game updates
  useEffect(() => {
    if (!mounted) return;
    
    // More frequent polling for active games to show gas regeneration
    const pollInterval = gameData?.status === 'active' ? 2000 : 5000; // 2s for active, 5s for others
    
    const interval = setInterval(() => {
      fetchGameData();
      
      // Log gas state for debugging
      if (gameState && gameData?.status === 'active') {
        console.log('🔥 Gas update check:', {
          gasUnits: gameState.gasUnits,
          territories: gameState.territoriesCount,
          timestamp: new Date().toISOString()
        });
      }
    }, pollInterval);
    
    return () => clearInterval(interval);
  }, [mounted, fetchGameData, gameData?.status, gameState]);
  
  // Schedule AI actions for active games - only when it's AI turn
  useEffect(() => {
    if (!mounted || !gameData?.game?.status || gameData.game.status !== 'active') return;
    
    const hasAI = gameData.players?.some(p => p.is_bot);
    if (!hasAI) return;
    
    // Check if it's currently an AI player's turn
    const currentTurnPlayerId = gameData.game?.current_turn_player_id;
    const currentPlayer = gameData.players?.find(p => p.id === currentTurnPlayerId);
    
    if (!currentPlayer?.is_bot) {
      // Not AI turn, don't schedule actions
      return;
    }
    
    console.log(`🤖 It's AI ${currentPlayer.username}'s turn - scheduling action`);
    
    const scheduleAIActions = () => {
      fetch(`/api/games/${gameId}/ai-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(response => response.json())
      .then(data => {
        console.log('🤖 AI response:', data);
        if (data.actionsPerformed > 0) {
          console.log(`🤖 AI performed ${data.actionsPerformed} actions`);
          // Refresh game data after AI actions
          setTimeout(fetchGameData, 1000);
        }
      })
      .catch(error => console.error('Error triggering AI actions:', error));
    };
    
    // Give AI a moment to "think" then make their move
    const aiTimeout = setTimeout(scheduleAIActions, 2000);
    
    return () => {
      clearTimeout(aiTimeout);
    };
  }, [mounted, gameData?.game?.status, gameData?.game?.current_turn_player_id, gameData?.players, gameId, fetchGameData]);
  
  // Auto-clear action result after 5 seconds
  useEffect(() => {
    if (actionResult) {
      const timer = setTimeout(() => {
        setActionResult(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [actionResult]);
  
  // Check for game completion and redirect
  useEffect(() => {
    if (!mounted || !gameData?.game) return;
    
    if (gameData.game.status === 'completed') {
      // Show completion message and redirect after a longer delay to show results
      setTimeout(() => {
        router.push('/lobby');
      }, 15000); // Increased to 15 seconds to see victory screen
    }
  }, [mounted, gameData?.game?.status, router]);
  
  // NOW SAFE FOR CONDITIONAL RETURNS AFTER ALL HOOKS
  // Show loading state during SSR
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-green-400 font-bold text-xl">Loading game...</div>
        </div>
    );
  }
  
  if (error || !gameData) {
    return (
      <main className="flex flex-col h-screen overflow-hidden gas-container">
        <GameHeader isWalletConnected={isConnected} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl text-red-400 mb-4">{error || 'Game not found'}</div>
            <button 
              onClick={() => router.push('/lobby')}
              className="px-4 py-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="flex flex-col h-screen overflow-hidden gas-container">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {gasClouds.map((cloud, i) => (
          <div 
            key={i}
            className={`absolute rounded-full animate-pulse opacity-20 ${cloud.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'}`}
            style={{
              left: `${cloud.x}%`,
              top: `${cloud.y}%`,
              width: `${cloud.size}px`,
              height: `${cloud.size}px`,
              filter: 'blur(20px)',
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      <GameHeader isWalletConnected={isConnected} />
      
      <div className="flex items-center px-6 py-2 bg-black/30">
        <button 
          onClick={() => router.push('/lobby')}
          className="mr-4 text-green-400 hover:text-green-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        
        <h1 className="text-xl font-semibold text-green-400">{gameData.name}</h1>
        
        {isSpectating && (
          <div className="ml-4 px-3 py-1 rounded text-sm bg-blue-700/50 text-blue-300 border border-blue-500/30">
            👁️ Spectating
          </div>
        )}
        
        <div className={`ml-4 px-3 py-1 rounded text-sm font-semibold ${
          gameData.status === 'active' ? 'bg-green-700/50 text-green-300 border border-green-500/30' :
          gameData.status === 'pending' ? 'bg-yellow-700/50 text-yellow-300 border border-yellow-500/30' :
          'bg-gray-700/50 text-gray-300 border border-gray-500/30'
        }`}>
          {gameData.status === 'pending' ? '⏳ Waiting for Players' : 
           gameData.status === 'active' ? '🎮 Game Active' : '✅ Completed'}
        </div>
        
        <div className="ml-4 text-sm text-gray-400 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="m22 21-3-3m0 0a6 6 0 1 0-8 0l3 3"/>
          </svg>
          <span>{gameData.players.length} Players</span>
        </div>
        
        {/* Game Timer */}
        {gameData.status === 'active' && getTimeRemaining() && (
          <div className="ml-4 px-3 py-1 rounded text-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-mono">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              {getTimeRemaining()}
            </span>
          </div>
        )}
        
        {/* Player Status */}
        {gameState && !isSpectating && (
          <div className="ml-auto flex items-center gap-4 text-sm">
            <div className="text-green-400 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <span className="font-semibold">{gameState.territoriesCount}</span>
              <span className="text-gray-400">territories</span>
            </div>
            <div className="text-blue-400 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <span className="font-semibold">{gameState.gasUnits}</span>
              <span className="text-gray-400">gas units</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar Toggle Button */}
        <div 
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 cursor-pointer"
          onClick={toggleSidebar}
        >
          <button className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-full transition-all">
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            )}
          </button>
        </div>
        
        <Sidebar
          isOpen={sidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isWalletConnected={isConnected}
          gameId={gameId}
        />
        
        <GameBoard 
          isWalletConnected={isConnected} 
          gameId={gameId}
          territories={gameData.territories}
          playerId={playerId || undefined}
          selectedAction={selectedAction || undefined}
          onTileAction={handleTileAction}
          gameState={gameState || undefined}
          actionResult={actionResult}
        />
        
        {/* Action Result Display */}
        {actionResult && (
          <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg border font-semibold transition-all duration-500 ${
            actionResult.success 
              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}>
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
              <span>{actionResult.message}</span>
            </div>
          </div>
        )}
      </div>
      
      {isConnected && !isSpectating && gameData?.status === 'active' && (
        <GameControls 
          isWalletConnected={isConnected} 
          gameId={gameId}
          playerId={playerId || undefined}
          onActionSelect={setSelectedAction}
          gameState={gameState || undefined}
          onGameStateUpdate={refreshGameState}
        />
      )}
      
      {/* Victory/Game Completion Overlay */}
      {gameData?.status === 'completed' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="max-w-lg w-full mx-4 p-6 bg-gray-900/95 border-2 border-green-500/30 rounded-lg text-center">
            <div className="mb-4">
              <h2 className="text-3xl font-bold text-green-400 mb-2">🎉 Game Complete!</h2>
              <p className="text-gray-300">
                Fart.box: Gas Dominance - Season 1
              </p>
            </div>
            
            {/* Winner Display */}
            {gameData.players && (
              <div className="mb-6">
                <div className="text-lg text-yellow-400 mb-3">👑 Final Standings:</div>
                <div className="space-y-2">
                  {gameData.players
                    .sort((a, b) => (b.territories_count || 0) - (a.territories_count || 0))
                    .slice(0, 3)
                    .map((player, index) => (
                    <div 
                      key={player.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                        index === 1 ? 'bg-gray-500/20 border border-gray-500/30' :
                        'bg-orange-500/20 border border-orange-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className={`font-semibold ${
                          index === 0 ? 'text-yellow-400' :
                          index === 1 ? 'text-gray-300' :
                          'text-orange-400'
                        }`}>
                          {player.is_bot ? '🤖 ' : ''}{player.username || `Player ${player.id}`}
                          {player.id === playerId ? ' (You)' : ''}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {player.territories_count || 0} territories
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/lobby')}
                className="w-full px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors"
              >
                Return to Lobby
              </button>
              <p className="text-xs text-gray-400">
                Automatically returning to lobby in 15 seconds...
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 