'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import GameHeader from '../../components/GameHeader';
import Sidebar from '../../components/Sidebar';
import { ActiveTab } from '../../components/Sidebar';

// Types
type GameInstance = {
  id: string;
  name: string;
  createdBy: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'in-progress' | 'completed';
  createdAt: string;
};

export default function LobbyPage() {
  const [activeGames, setActiveGames] = useState<GameInstance[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [gasClouds, setGasClouds] = useState<{ x: number; y: number; size: number; color: string }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('leaderboard');
  
  const { isConnected, address } = useAccount();
  const router = useRouter();
  
  // Placeholder function - will be replaced with actual API call
  const fetchActiveGames = async () => {
    // Mock data for now
    setActiveGames([
      {
        id: '1',
        name: 'Gas War Zone Alpha',
        createdBy: '0x1234...5678',
        playerCount: 3,
        maxPlayers: 6,
        status: 'waiting',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '2',
        name: 'Methane Battleground',
        createdBy: '0x9876...5432',
        playerCount: 6,
        maxPlayers: 6,
        status: 'in-progress',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ]);
  };
  
  const createNewGame = () => {
    // Will be replaced with actual API call
    const newGameId = Date.now().toString();
    // After creating, redirect to the new game
    router.push(`/game/${newGameId}`);
  };
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Generate background gas clouds
    const clouds = Array.from({ length: 5 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 20 + Math.random() * 30,
      color: Math.random() > 0.5 ? 'green' : 'yellow'
    }));
    setGasClouds(clouds);
    
    // Load active games
    fetchActiveGames();
  }, [isConnected, router]);
  
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
      
      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar Toggle Button */}
        <div 
          className="absolute left-4 top-20 z-30 cursor-pointer"
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
        
        {/* Sidebar for connected users */}
        <Sidebar
          isOpen={sidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isWalletConnected={isConnected}
        />
        
        {/* Main Lobby Content */}
        <div className="flex-1 container mx-auto py-8 px-4 overflow-auto">
          <div className="flex justify-between items-center mb-8 pl-10">
            <h1 className="text-3xl font-bold text-green-400">Game Lobby</h1>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
            >
              Create New Game
            </button>
          </div>
          
          <div className="bg-black/30 rounded-xl backdrop-blur-sm p-6 ml-10">
            <h2 className="text-xl text-green-300 mb-4">Active Games</h2>
            
            {activeGames.length === 0 ? (
              <p className="text-gray-300">No active games found. Create one to get started!</p>
            ) : (
              <div className="grid gap-4">
                {activeGames.map(game => (
                  <div key={game.id} className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <h3 className="text-xl text-white font-semibold">{game.name}</h3>
                      <p className="text-gray-400">Created by: {game.createdBy}</p>
                      <p className="text-gray-400">Players: {game.playerCount}/{game.maxPlayers}</p>
                      <p className="text-gray-400">Status: {game.status}</p>
                    </div>
                    <button
                      className={`px-4 py-2 rounded-lg ${
                        game.status === 'waiting' 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : game.status === 'in-progress'
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : 'bg-gray-500 text-gray-200 cursor-not-allowed'
                      }`}
                      onClick={() => router.push(`/game/${game.id}`)}
                      disabled={game.status === 'completed'}
                    >
                      {game.status === 'waiting' ? 'Join Game' : game.status === 'in-progress' ? 'Spectate' : 'Completed'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md">
            <h2 className="text-2xl text-green-400 mb-4">Create New Game</h2>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Game Name</label>
              <input
                type="text"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                placeholder="Enter game name..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={createNewGame}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
                disabled={!newGameName.trim()}
              >
                Create Game
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 