'use client';

import { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion'; // Removed, assuming Sidebar handles its own animation
import { useAccount } from 'wagmi';
// import { useAppKit } from '@reown/appkit/react'; // Keep for now if any child needs a connect fn directly

// Import your components
import GameHeader from '@/components/GameHeader';
import Sidebar from '@/components/Sidebar';
import GameBoard from '@/components/GameBoard';
import GameControls from '@/components/GameControls';

// Define the active tab type if not already globally available
export type ActiveTab = 'leaderboard' | 'profile' | 'chat';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('leaderboard');
  const [gasClouds, setGasClouds] = useState<{ x: number; y: number; size: number; color: string }[]>([]);

  const { isConnected: isWalletConnected /*, address*/ } = useAccount(); // Removed address for now
  // const { open: openAppKitModal } = useAppKit();

  useEffect(() => {
    const clouds = Array.from({ length: 5 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 20 + Math.random() * 30,
      color: Math.random() > 0.5 ? 'green' : 'yellow'
    }));
    setGasClouds(clouds);
  }, []);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <main className="flex flex-col h-screen overflow-hidden gas-container">
      
      {/* Background Effects (can remain or be part of a layout/background component) */}
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
      
      <GameHeader isWalletConnected={isWalletConnected} />
      
      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar Toggle Button - This could be part of the Sidebar component or main layout logic */}
        <div 
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30" // Increased z-index
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
          isWalletConnected={isWalletConnected}
        />
        
        <GameBoard isWalletConnected={isWalletConnected} />
      </div>
      
      {isWalletConnected && <GameControls isWalletConnected={isWalletConnected} />}
    </main>
  );
}
