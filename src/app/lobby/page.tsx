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
    botCount: 0,
    allowedGasTypes: ['green', 'yellow', 'toxic'],
    gameDuration: 30,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('help');
  
  const { address, isConnected } = useAccount();
  const router = useRouter();
  
  // Generate background effects
  useEffect(() => {
    // Generate background gas clouds
    const clouds = Array.from({ length: 12 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 30 + Math.random() * 80,
      color: Math.random() > 0.6 
        ? 'green' 
        : Math.random() > 0.3 
          ? 'yellow' 
          : 'toxic',
      speed: 0.5 + Math.random() * 2
    }));
    setGasClouds(clouds);
    
    // Generate floating gas particles
    const particles = Array.from({ length: 30 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 10,
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
        let newX = particle.x + Math.cos(radians) * 0.1;
        let newY = particle.y + Math.sin(radians) * 0.1;
        
        // Wrap around edges
        if (newX > 105) newX = -5;
        if (newX < -5) newX = 105;
        if (newY > 105) newY = -5;
        if (newY < -5) newY = 105;
        
        // Occasionally change direction
        const newDirection = Math.random() > 0.95 
          ? (particle.direction + (Math.random() * 40 - 20)) % 360 
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
  
  // Handle authentication and fetch games
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
          // Fetch available games with player information
          return fetch(`/api/games?status=pending&playerId=${data.player.id}`);
        }
      })
      .then(res => res?.json())
      .then(data => {
        if (data?.games) {
          setGames(data.games);
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
  
  // Create a new game
  const createGame = async () => {
    if (!playerId) {
      setError('You must be connected with a wallet to create a game');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Creating game with options:', {
        playerId,
        maxPlayers: gameOptions.maxPlayers,
        includeBots: gameOptions.includeBots,
        botCount: gameOptions.botCount,
        gameDuration: gameOptions.gameDuration
      });
      
      console.log('Sending API request to create game...');
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
      
      console.log('API response status:', res.status);
      
      console.log('Parsing response as JSON...');
      const data = await res.json();
      console.log('API response data:', data);
      
      if (data.success) {
        console.log('Game created successfully, gameId type:', typeof data.gameId);
        console.log('Redirecting to game page:', `/game/${data.gameId}`);
        setShowCreateModal(false);
        
        // Use a direct window location redirect instead of Next.js router
        // This forces a full page reload which might be needed
        console.log('Attempting window.location.href redirect');
        window.location.href = `/game/${data.gameId}`;
        
        // Fallback to router.push if the above doesn't trigger immediately
        console.log('Setting up router fallback...');
        setTimeout(() => {
          console.log('Executing router.push fallback');
          router.push(`/game/${data.gameId}`);
        }, 500);
      } else {
        console.error('Game creation failed with error:', data.error || 'Unknown error');
        setError(data.error || 'Failed to create game');
        setLoading(false);
      }
    } catch (error) {
      console.error('Exception during game creation:', error);
      setError('Failed to create game. Please try again.');
      setLoading(false);
    }
  };
  
  // Join an existing game
  const joinGame = async (gameId: string) => {
    if (!playerId) {
      setError('You must be connected with a wallet to join a game');
      return;
    }
    
    try {
      setLoading(true);
      
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Redirect to game page
        router.push(`/game/${gameId}`);
      } else {
        setError(data.error || 'Failed to join game');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error joining game:', error);
      setError('Failed to join game. Please try again.');
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
          
          <h2 className="text-2xl font-semibold text-white mb-4">Active Games</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-300">Loading games...</p>
            </div>
          ) : games.length > 0 ? (
            <div className="space-y-4">
              {games.map(game => (
                <div key={game.id} className="bg-black/30 backdrop-blur-sm p-6 rounded-xl border border-green-500/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-green-400">
                        Game #{game.id}
                      </h3>
                      <p className="text-gray-300">Players: {game.playerCount}/{game.maxPlayers}</p>
                      <p className="text-gray-300">Status: {game.status}</p>
                    </div>
                    <div>
                      {game.isPlayerInGame ? (
                        <button 
                          onClick={() => joinGame(game.id)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-all"
                          disabled={loading}
                        >
                          {game.status === 'active' ? 'Rejoin Game' : 'Enter Game'}
                        </button>
                      ) : game.status === 'pending' && game.playerCount < game.maxPlayers ? (
                        <button 
                          onClick={() => joinGame(game.id)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-all"
                          disabled={loading}
                        >
                          Join Game
                        </button>
                      ) : (
                        <button 
                          onClick={() => router.push(`/game/${game.id}?spectate=true`)}
                          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold transition-all"
                          disabled={loading}
                        >
                          Spectate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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