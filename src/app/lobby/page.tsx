'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import GameHeader from '@/components/GameHeader';
import Sidebar from '@/components/Sidebar';
import { ActiveTab } from '../../components/Sidebar';

// Types
type GameInstance = {
  id: string;
  name: string;
  createdBy: string;
  playerCount: number;
  maxPlayers: number;
  status: 'pending' | 'active' | 'completed';
  createdAt: string;
  isPlayerInGame?: boolean;
  gameDuration?: number;
  startTime?: string;
};

type GameOptions = {
  maxPlayers: number;
  includeBots: boolean;
  botCount: number;
  allowedGasTypes: string[];
  gameDuration: number; // in minutes
};

export default function Lobby() {
  const [games, setGames] = useState<GameInstance[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gasClouds, setGasClouds] = useState<{ x: number; y: number; size: number; color: string; speed: number }[]>([]);
  const [gasParticles, setGasParticles] = useState<{ x: number; y: number; size: number; color: string; direction: number }[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    maxPlayers: 6,
    includeBots: false,
    botCount: 2,
    allowedGasTypes: ['green', 'yellow', 'toxic'],
    gameDuration: 15, // Default to 15 minutes for faster games
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('help');
  
  const { address, isConnected } = useAccount();
  const router = useRouter();
  
  // Generate background effects
  useEffect(() => {
    // Generate background gas clouds
    const clouds = Array.from({ length: 8 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 30 + Math.random() * 60,
      color: Math.random() > 0.6 
        ? 'green' 
        : Math.random() > 0.3 
          ? 'yellow' 
          : 'toxic',
      speed: 0.5 + Math.random() * 1.5
    }));
    setGasClouds(clouds);
    
    // Generate floating gas particles
    const particles = Array.from({ length: 20 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 3 + Math.random() * 8,
      color: Math.random() > 0.6 
        ? 'green' 
        : Math.random() > 0.3 
          ? 'yellow' 
          : 'toxic',
      direction: Math.random() * 360
    }));
    setGasParticles(particles);
    
    // Animate particles floating around
    const animateParticles = setInterval(() => {
      setGasParticles(prev => prev.map(particle => {
        const radians = particle.direction * Math.PI / 180;
        let newX = particle.x + Math.cos(radians) * 0.08;
        let newY = particle.y + Math.sin(radians) * 0.08;
        
        // Wrap around edges
        if (newX > 105) newX = -5;
        if (newX < -5) newX = 105;
        if (newY > 105) newY = -5;
        if (newY < -5) newY = 105;
        
        // Occasionally change direction
        const newDirection = Math.random() > 0.98 
          ? (particle.direction + (Math.random() * 60 - 30)) % 360 
          : particle.direction;
          
        return {
          ...particle,
          x: newX,
          y: newY,
          direction: newDirection
        };
      }));
    }, 50);
    
    return () => clearInterval(animateParticles);
  }, []);
  
  // Fetch available games
  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games');
      const data = await response.json();
      
      if (data.success) {
        // Filter to only show active or pending games (not completed)
        const activeGames = data.games.filter((game: GameInstance) => 
          game.status === 'pending' || game.status === 'active'
        );
        setGames(activeGames);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle authentication and initial data fetch
  useEffect(() => {
    // Redirect to home if wallet is not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    if (isConnected && address) {
      // Authenticate player
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.player) {
          setPlayerId(data.player.id);
          fetchGames();
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      });
    }
  }, [isConnected, address, router]);
  
  // Set up periodic refresh of games
  useEffect(() => {
    if (!playerId) return;
    
    const interval = setInterval(() => {
      fetchGames();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [playerId]);
  
  // Calculate time remaining for active games
  const getTimeRemaining = (game: GameInstance) => {
    if (game.status !== 'active' || !game.startTime || !game.gameDuration) {
      return null;
    }
    
    const startTime = new Date(game.startTime).getTime();
    const duration = game.gameDuration * 60 * 1000; // Convert minutes to milliseconds
    const endTime = startTime + duration;
    const now = Date.now();
    const remaining = endTime - now;
    
    if (remaining <= 0) return 'Ending Soon';
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Create a new game
  const createGame = async () => {
    if (!playerId) {
      setError('You must be connected with a wallet to create a game');
      return;
    }
    
    try {
      setLoading(true);
      
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId,
          maxPlayers: gameOptions.maxPlayers,
          includeBots: gameOptions.includeBots,
          botCount: gameOptions.botCount,
          allowedGasTypes: gameOptions.allowedGasTypes,
          gameDuration: gameOptions.gameDuration
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setShowCreateModal(false);
        router.push(`/game/${data.gameId}`);
      } else {
        setError(data.error || 'Failed to create game');
      }
    } catch (err) {
      console.error('Error creating game:', err);
      setError('Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  return (
    <main className="flex flex-col h-screen overflow-hidden gas-container">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Glow effect in center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-green-500/10 via-transparent to-transparent"></div>
        
        {/* Gas clouds */}
        {gasClouds.map((cloud, i) => (
          <div 
            key={i}
            className={`absolute rounded-full animate-pulse ${
              cloud.color === 'green' 
                ? 'bg-green-500' 
                : cloud.color === 'yellow' 
                  ? 'bg-yellow-500' 
                  : 'bg-purple-500'
            } opacity-${cloud.size > 70 ? '10' : cloud.size > 40 ? '15' : '20'}`}
            style={{
              left: `${cloud.x}%`,
              top: `${cloud.y}%`,
              width: `${cloud.size}px`,
              height: `${cloud.size}px`,
              filter: 'blur(30px)',
              animationDuration: `${7 - cloud.speed}s`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
        
        {/* Gas particles */}
        {gasParticles.map((particle, i) => (
          <div 
            key={`p-${i}`}
            className={`absolute rounded-full ${
              particle.color === 'green' 
                ? 'bg-green-400' 
                : particle.color === 'yellow' 
                  ? 'bg-yellow-400' 
                  : 'bg-purple-400'
            } opacity-30`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              filter: 'blur(2px)',
              transition: 'all 0.5s linear'
            }}
          />
        ))}
      </div>
      
      <GameHeader isWalletConnected={isConnected} />
      
      <div className="flex flex-1 z-10">
        <div className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-green-400">Game Lobby</h1>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-lg font-bold transition-all"
              disabled={loading || !playerId}
            >
              Create New Game
            </button>
          </div>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          <h2 className="text-2xl font-semibold text-white mb-4">Available Games</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-300">Loading games...</p>
            </div>
          ) : games.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-green-500/50 scrollbar-track-transparent">
              {games.map(game => {
                const timeRemaining = getTimeRemaining(game);
                
                return (
                  <div key={game.id} className="bg-black/30 backdrop-blur-sm p-6 rounded-xl border border-green-500/20 hover:border-green-500/40 transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-xl font-bold text-green-400">
                            Game #{game.id}
                          </h3>
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            game.status === 'pending' 
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                              : game.status === 'active'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {game.status === 'pending' ? 'Waiting for Players' : 
                             game.status === 'active' ? 'In Progress' : 'Completed'}
                          </div>
                          {game.isPlayerInGame && (
                            <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                              You're in this game
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 text-gray-300">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="m22 21-3-3m0 0a6 6 0 1 0-8 0l3 3"/>
                            </svg>
                            <span>{game.playerCount}/{game.maxPlayers} Players</span>
                          </div>
                          
                          {game.gameDuration && (
                            <div className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12,6 12,12 16,14"/>
                              </svg>
                              <span>{game.gameDuration} min duration</span>
                            </div>
                          )}
                          
                          {timeRemaining && (
                            <div className="flex items-center gap-2 text-yellow-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12,6 12,12 16,14"/>
                              </svg>
                              <span className="font-semibold">{timeRemaining} remaining</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {game.isPlayerInGame ? (
                          <>
                            <button 
                              onClick={() => router.push(`/game/${game.id}`)}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-all"
                              disabled={loading}
                            >
                              {game.status === 'active' ? 'Rejoin Game' : 'Enter Game'}
                            </button>
                            {game.status === 'active' && (
                              <button 
                                onClick={() => router.push(`/game/${game.id}?spectate=true`)}
                                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all"
                                disabled={loading}
                              >
                                Spectate
                              </button>
                            )}
                          </>
                        ) : game.status === 'pending' && game.playerCount < game.maxPlayers ? (
                          <button 
                            onClick={() => router.push(`/game/${game.id}`)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-all"
                            disabled={loading}
                          >
                            Join Game
                          </button>
                        ) : (
                          <button 
                            onClick={() => router.push(`/game/${game.id}?spectate=true`)}
                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all"
                            disabled={loading}
                          >
                            Spectate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-black/20 backdrop-blur-sm rounded-xl border border-green-500/10">
              <p className="text-xl text-gray-300 mb-4">No games available at the moment.</p>
              <p className="text-gray-400">Create a new game to get started!</p>
            </div>
          )}
        </div>
        
        <Sidebar
          isOpen={sidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isWalletConnected={isConnected}
        />
      </div>
      
      {/* Game Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 border border-green-500/30 rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-green-400 mb-6">Create New Game</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2">Max Players</label>
                <select 
                  className="w-full bg-black/50 border border-green-500/30 rounded p-2 text-white"
                  value={gameOptions.maxPlayers}
                  onChange={(e) => setGameOptions({...gameOptions, maxPlayers: parseInt(e.target.value)})}
                >
                  <option value="2">2 Players</option>
                  <option value="4">4 Players</option>
                  <option value="6">6 Players</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox"
                  id="includeBots"
                  className="mr-2"
                  checked={gameOptions.includeBots}
                  onChange={(e) => setGameOptions({...gameOptions, includeBots: e.target.checked})}
                />
                <label htmlFor="includeBots" className="text-gray-300">Include AI Players</label>
              </div>
              
              {gameOptions.includeBots && (
                <div>
                  <label className="block text-gray-300 mb-2">Number of AI Players</label>
                  <select 
                    className="w-full bg-black/50 border border-green-500/30 rounded p-2 text-white"
                    value={gameOptions.botCount}
                    onChange={(e) => setGameOptions({...gameOptions, botCount: parseInt(e.target.value)})}
                  >
                    {Array.from({length: gameOptions.maxPlayers - 1}, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num} AI Player{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-gray-300 mb-2">Game Duration</label>
                <select
                  className="w-full bg-black/50 border border-green-500/30 rounded p-2 text-white"
                  value={gameOptions.gameDuration}
                  onChange={(e) => setGameOptions({...gameOptions, gameDuration: parseInt(e.target.value)})}
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-4 mt-8">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  Cancel
                </button>
                <button 
                  onClick={createGame}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Game'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 