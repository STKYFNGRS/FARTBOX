'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useEnsName, useEnsAvatar } from 'wagmi';
import { normalize } from 'viem/ens';

import GameHeader from '../../components/GameHeader';
import CreateGameModal from '../../components/CreateGameModal';
import OnlinePlayers from '../../components/lobby/OnlinePlayers';

interface GameInfo {
  id: string;
  player_count: number;
  max_players: number;
  status: string;
  game_duration: number;
  isPlayerInGame?: boolean;
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  walletAddress: string;
  displayName?: string;
  ens_name?: string;
  ens_avatar?: string;
  isBot?: boolean;
}

interface OnlineUser {
  id: string;
  username: string;
  walletAddress: string;
  isBot?: boolean;
  lastSeen: Date;
}

export default function Lobby() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  
  // Get ENS data for current user
  const { data: ensName } = useEnsName({
    address: address,
    chainId: 1,
  });
  
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: 1,
  });
  
  const [mounted, setMounted] = useState(false);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Background effects
  const [gasClouds, setGasClouds] = useState<{ x: number; y: number; size: number; color: string }[]>([]);

  const authenticatePlayer = async () => {
    if (!address) return;
    
    try {
      // First update user with ENS data
      await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          ensName,
          ensAvatar
        })
      });

      // Then authenticate
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
  };

  const fetchGames = async () => {
    try {
      const url = playerId 
        ? `/api/games?status=pending&playerId=${playerId}`
        : '/api/games?status=pending';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.games) {
        setGames(data.games);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching games:', error);
      setLoading(false);
    }
  };

  const joinGame = async (gameId: string) => {
    if (!playerId) return;
    
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        router.push(`/game/${gameId}`);
      } else {
        alert(result.error || 'Failed to join game');
      }
    } catch (error) {
      console.error('Error joining game:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !playerId) return;
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId, 
          message: chatInput.trim(),
          type: 'lobby'
        })
      });
      
      if (response.ok) {
        setChatInput('');
        fetchChatMessages(); // Refresh messages
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const response = await fetch('/api/chat?type=lobby&limit=50');
      const data = await response.json();
      
      if (data.messages) {
        setChatMessages(data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  useEffect(() => {
    setMounted(true);
    
    // Generate background effects
    const clouds = Array.from({ length: 8 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 30 + Math.random() * 50,
      color: Math.random() > 0.6 ? 'green' : Math.random() > 0.5 ? 'yellow' : 'purple'
    }));
    setGasClouds(clouds);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      authenticatePlayer();
    }
  }, [isConnected, address, ensName, ensAvatar]);

  useEffect(() => {
    if (playerId) {
      fetchGames();
      fetchChatMessages();
    }
  }, [playerId]);

  useEffect(() => {
    // Auto-scroll chat to bottom
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    // Poll for updates
    const interval = setInterval(() => {
      if (playerId) {
        fetchGames();
        fetchChatMessages();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [playerId]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-green-400 font-bold text-xl">Loading...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <GameHeader isWalletConnected={false} />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-green-400 mb-4">
              Connect Your Wallet to Enter the Lobby
            </h1>
            <p className="text-gray-300 text-lg">
              Join the gas wars and dominate the battlefield!
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {gasClouds.map((cloud, i) => (
          <div 
            key={i}
            className={`absolute rounded-full animate-pulse opacity-10 ${
              cloud.color === 'green' ? 'bg-green-500' : 
              cloud.color === 'yellow' ? 'bg-yellow-500' : 
              'bg-purple-500'
            }`}
            style={{
              left: `${cloud.x}%`,
              top: `${cloud.y}%`,
              width: `${cloud.size}px`,
              height: `${cloud.size}px`,
              filter: 'blur(30px)',
              animationDuration: `${4 + Math.random() * 6}s`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
      </div>
      
      <GameHeader isWalletConnected={isConnected} />
      
      {/* Main Content */}
      <div className="relative z-10 grid grid-cols-12 gap-6 p-6 min-h-[calc(100vh-80px)]">
        
        {/* Left Sidebar - Online Players */}
        <div className="col-span-3">
          <OnlinePlayers />
        </div>

        {/* Center - Games List */}
        <div className="col-span-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-green-400">Game Lobby</h1>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors font-semibold"
            >
              Create New Game
            </button>
          </div>
          
          {/* Active Games */}
          <div className="bg-black/40 backdrop-blur-md border border-green-500/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-400 mb-4">Available Games</h2>
            
            {loading ? (
              <div className="text-center text-gray-400 py-8">Loading games...</div>
            ) : games.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-lg mb-2">No games available</div>
                <div className="text-gray-500 text-sm">Create a new game to get started!</div>
              </div>
            ) : (
              <div className="space-y-3">
                {games.map((game) => (
                  <div 
                    key={game.id}
                    className="flex items-center justify-between p-4 bg-black/30 border border-gray-600/30 rounded-lg hover:border-green-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-green-400 font-bold">{game.id}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-green-300">Game {game.id}</div>
                        <div className="text-sm text-gray-400">
                          {game.player_count}/{game.max_players} players • {game.game_duration}min duration
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded text-sm font-semibold ${
                        game.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        game.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {game.status === 'pending' ? '⏳ Waiting' : 
                         game.status === 'active' ? '🎮 Active' : '✅ Complete'}
                      </div>
                      
                      {game.isPlayerInGame ? (
                        <button 
                          onClick={() => router.push(`/game/${game.id}`)}
                          className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors"
                        >
                          Rejoin
                        </button>
                      ) : (
                        <button 
                          onClick={() => joinGame(game.id)}
                          disabled={game.player_count >= game.max_players}
                          className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Join Game
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Game Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black/40 backdrop-blur-md border border-green-500/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{games.length}</div>
              <div className="text-sm text-gray-400">Active Lobbies</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md border border-green-500/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">-</div>
              <div className="text-sm text-gray-400">Players Online</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md border border-green-500/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {games.reduce((sum, game) => sum + game.player_count, 0)}
              </div>
              <div className="text-sm text-gray-400">Players in Games</div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Chat */}
        <div className="col-span-3 bg-black/40 backdrop-blur-md border border-green-500/20 rounded-lg flex flex-col">
          <div className="p-4 border-b border-green-500/20">
            <h2 className="text-xl font-bold text-green-400">Lobby Chat</h2>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-96">
            {chatMessages.map((message) => (
              <div key={message.id} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold ${
                    message.isBot ? 'text-purple-400' : 'text-green-400'
                  }`}>
                    {message.isBot ? '🤖 ' : ''}{message.displayName || message.username || 'Anonymous'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-gray-300 ml-2">{message.message}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          {/* Chat Input */}
          <div className="p-4 border-t border-green-500/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-black/30 border border-gray-600/30 rounded text-gray-300 placeholder-gray-500 focus:outline-none focus:border-green-500/50"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim()}
                className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Game Modal */}
      {showCreateModal && (
        <CreateGameModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)}
          onGameCreated={(gameId: string) => {
            setShowCreateModal(false);
            router.push(`/game/${gameId}`);
          }}
        />
      )}
    </main>
  );
} 