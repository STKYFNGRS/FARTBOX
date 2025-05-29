'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('help');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [gasClouds, setGasClouds] = useState<{ x: number; y: number; size: number; color: string }[]>([]);
  const [isSpectating, setIsSpectating] = useState(false);
  const [actionResult, setActionResult] = useState<{success: boolean, message: string, timestamp: number} | null>(null);
  
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;
  
  // Check if in spectate mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsSpectating(urlParams.get('spectate') === 'true');
  }, []);
  
  // Authenticate player and get player ID
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
  
  // Refresh game state after actions
  const refreshGameState = useCallback(async () => {
    await fetchGameData();
  }, [fetchGameData]);
  
  // Handle tile actions from GameBoard
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
    if (!gameData || gameData.status !== 'active') return;
    
    const interval = setInterval(() => {
      refreshGameState();
    }, 5000); // Poll every 5 seconds during active games
    
    return () => clearInterval(interval);
  }, [gameData?.status, refreshGameState]);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  if (loading) {
    return (
      <main className="flex flex-col h-screen overflow-hidden gas-container">
        <GameHeader isWalletConnected={isConnected} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-2xl text-green-400">Loading game data...</div>
        </div>
      </main>
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
          <div className="ml-4 px-2 py-1 rounded text-sm bg-blue-700/50 text-blue-300">
            Spectating
          </div>
        )}
        <div className={`ml-4 px-2 py-1 rounded text-sm ${
          gameData.status === 'active' ? 'bg-green-700/50 text-green-300' :
          gameData.status === 'pending' ? 'bg-yellow-700/50 text-yellow-300' :
          'bg-gray-700/50 text-gray-300'
        }`}>
          {gameData.status === 'pending' ? 'Waiting for Players' : 
           gameData.status === 'active' ? 'In Progress' : 'Completed'}
        </div>
        <div className="ml-4 text-sm text-gray-400">
          Players: {gameData.players.length}
        </div>
        {gameState && (
          <div className="ml-auto text-sm text-green-400">
            Territories: {gameState.territoriesCount}
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
    </main>
  );
} 