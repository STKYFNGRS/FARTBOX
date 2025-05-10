import React, { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppKit } from '@reown/appkit/react';

// Define ActiveTab locally since it was removed from page.tsx
export type ActiveTab = 'leaderboard' | 'profile' | 'chat';

export interface SidebarProps {
  isOpen: boolean;
  activeTab: ActiveTab;
  setActiveTab: Dispatch<SetStateAction<ActiveTab>>;
  isWalletConnected: boolean;
  gameId?: string; // Optional for backward compatibility
}

const Sidebar = ({ isOpen, activeTab, setActiveTab, isWalletConnected, gameId }: SidebarProps) => {
  const [leaderboardData, setLeaderboardData] = useState<{name: string, score: number, address: string}[]>([]);
  
  // Load different data based on gameId
  useEffect(() => {
    if (!gameId) {
      // Load global leaderboard
      setLeaderboardData([
        { name: 'GasMaster', score: 9420, address: '0x1234...5678' },
        { name: 'TootCommander', score: 8650, address: '0x2345...6789' },
        { name: 'FartLord', score: 7890, address: '0x3456...7890' },
        { name: 'GasGiant', score: 6540, address: '0x4567...8901' },
        { name: 'StinkySol', score: 5430, address: '0x5678...9012' }
      ]);
    } else {
      // Load game-specific leaderboard
      setLeaderboardData([
        { name: 'Player1', score: 3210, address: '0x1234...5678' },
        { name: 'Player2', score: 2980, address: '0x2345...6789' },
        { name: 'Player3', score: 2450, address: '0x3456...7890' }
      ]);
      console.log('Loading data for game:', gameId);
    }
  }, [gameId]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-72 gas-container border-r border-green-500/30 overflow-hidden z-20"
        >
          {/* Sidebar Tabs */}
          <div className="flex border-b border-green-500/30">
            <button 
              className={`flex-1 p-3 text-sm font-medium ${activeTab === 'leaderboard' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              Leaderboard
            </button>
            <button 
              className={`flex-1 p-3 text-sm font-medium ${activeTab === 'profile' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('profile')}
            >
              My Profile
            </button>
            <button 
              className={`flex-1 p-3 text-sm font-medium ${activeTab === 'chat' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
          </div>
          
          {/* Sidebar Content based on active tab */}
          <div className="p-4 h-full overflow-y-auto">
            {activeTab === 'leaderboard' && <LeaderboardTab leaderboardData={leaderboardData} />}
            {activeTab === 'profile' && <ProfileTab isWalletConnected={isWalletConnected} />}
            {activeTab === 'chat' && <ChatTab isWalletConnected={isWalletConnected} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function LeaderboardTab({ leaderboardData }: { leaderboardData: {name: string, score: number, address: string}[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-green-400">Top Gas Dominators</h3>
      {!leaderboardData.length ? (
        <p className="text-gray-400">Loading leaderboard data...</p>
      ) : (
        <div className="space-y-2">
          {leaderboardData.map((player, index) => (
            <div key={index} className="flex items-center p-2 bg-green-500/10 rounded">
              <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center mr-3">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium">{player.name}</div>
                <div className="text-xs text-gray-400">{player.address}</div>
              </div>
              <div className="text-green-400 font-bold">{player.score}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ isWalletConnected }: { isWalletConnected: boolean }) {
  const { open: openAppKitModal } = useAppKit();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-green-400">My Fart Profile</h3>
      {isWalletConnected ? (
        <>
          <div className="p-4 bg-green-500/10 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Player NFT</span>
              <span className="text-sm text-green-400">#42069</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Level</span>
              <span className="text-sm text-green-400">3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Experience</span>
              <div className="w-32 h-2 bg-green-900/30 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 w-3/4"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Wins</span>
              <span className="text-sm text-green-400">5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">$TOOT Balance</span>
              <span className="text-sm text-yellow-400">420</span>
            </div>
          </div>
          <h4 className="text-md font-medium text-green-400 mt-6">My Gas Inventory</h4>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-2 bg-green-500/10 rounded-lg text-center">
                <div className="w-full aspect-square bg-green-500/20 rounded-lg mb-1 flex items-center justify-center gas-glow">
                  <span className="text-2xl">💨</span>
                </div>
                <span className="text-xs">Gas #{i+1}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400/50"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"></path><path d="M15 9H9V15H15V9Z"></path></svg>
          <div className="text-sm text-gray-400 text-center">
            Connect your wallet to view your fart profile
          </div>
          <button 
            onClick={() => openAppKitModal()}
            className="gas-button text-sm"
          >
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );
}

function ChatTab({ isWalletConnected }: { isWalletConnected: boolean }) {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <h3 className="text-lg font-medium text-green-400">Gas Chamber Chat</h3>
      <div className="flex-1 space-y-4 overflow-y-auto">
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400">P</div>
          <div className="flex-1">
            <div className="text-xs text-gray-400">Player4269</div>
            <div className="p-2 bg-yellow-500/10 rounded-lg text-sm">My fart is about to take over the north quadrant!</div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">G</div>
          <div className="flex-1">
            <div className="text-xs text-gray-400">GasLord420</div>
            <div className="p-2 bg-green-500/10 rounded-lg text-sm">Just released a mega gas bomb in sector 7! 💨</div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">T</div>
          <div className="flex-1">
            <div className="text-xs text-gray-400">TootMaster</div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-sm">Anyone want to form an alliance against the eastern bloc?</div>
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-4 border-t border-green-500/30">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Send a message..." 
            className="w-full p-2 pr-10 bg-green-500/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
          />
          <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar; 