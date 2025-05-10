'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';

import GameHeader from '../../../components/GameHeader';
import Sidebar from '../../../components/Sidebar';
import GameBoard from '../../../components/GameBoard';
import GameControls from '../../../components/GameControls';

// Define the active tab type if not already globally available
export type ActiveTab = 'leaderboard' | 'profile' | 'chat';

interface GameData {
  id: string;
  name: string;
  createdBy: string;
  players: string[];
  territories: any[]; // Will be properly typed once we define territory structure
  status: 'waiting' | 'in-progress' | 'completed';
}

export default function GamePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('leaderboard');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gasClouds, setGasClouds] = useState<{ x: number; y: number; size: number; color: string }[]>([]);
  
  const { isConnected } = useAccount();
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;
  
  const fetchGameData = async () => {
    setLoading(true);
    
    // This would be an API call in a real implementation
    // Mocking data for now
    setTimeout(() => {
      setGameData({
        id: gameId,
        name: `Game ${gameId}`,
        createdBy: '0x1234...5678',
        players: ['0x1234...5678', '0x5678...1234'],
        territories: [],
        status: 'waiting',
      });
      setLoading(false);
    }, 1000);
  };
  
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
    
    // Fetch game data
    fetchGameData();
  }, [isConnected, router, gameId]);
  
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
  
  if (!gameData) {
    return (
      <main className="flex flex-col h-screen overflow-hidden gas-container">
        <GameHeader isWalletConnected={isConnected} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-2xl text-red-400">Game not found</div>
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
          className="mr-4 text-green-400 hover:text-green-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-xl font-semibold text-green-400">{gameData.name}</h1>
        <div className="ml-4 px-2 py-1 bg-gray-700/50 rounded text-sm text-gray-300">
          {gameData.status}
        </div>
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
        />
      </div>
      
      {isConnected && <GameControls isWalletConnected={isConnected} gameId={gameId} />}
    </main>
  );
} 