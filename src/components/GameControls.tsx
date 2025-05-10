import { useState } from 'react';

export interface GameControlsProps {
  isWalletConnected: boolean;
  gameId?: string; // Optional for backward compatibility
}

const GameControls = ({ isWalletConnected, gameId }: GameControlsProps) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [actionCooldown, setActionCooldown] = useState(false);
  
  const handleAction = (action: string) => {
    if (actionCooldown) return;
    
    setSelectedAction(action);
    setActionCooldown(true);
    
    // Simulate action being taken
    console.log(`Taking action: ${action} in game: ${gameId || 'global'}`);
    
    // Reset cooldown after a delay
    setTimeout(() => {
      setActionCooldown(false);
      setSelectedAction(null);
    }, 2000);
  };
  
  if (!isWalletConnected) {
    return null;
  }
  
  return (
    <div className="p-4 bg-black/40 backdrop-blur-md border-t border-green-500/20">
      <div className="flex justify-between gap-4">
        <button
          className={`flex-1 py-2 px-4 rounded ${
            selectedAction === 'release' 
              ? 'bg-green-500 text-white' 
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          } transition-all flex flex-col items-center ${actionCooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => handleAction('release')}
          disabled={actionCooldown}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Release Gas
        </button>
        
        <button
          className={`flex-1 py-2 px-4 rounded ${
            selectedAction === 'boost' 
              ? 'bg-yellow-500 text-white' 
              : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
          } transition-all flex flex-col items-center ${actionCooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => handleAction('boost')}
          disabled={actionCooldown}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Boost Power
        </button>
        
        <button
          className={`flex-1 py-2 px-4 rounded ${
            selectedAction === 'alliance' 
              ? 'bg-blue-500 text-white' 
              : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
          } transition-all flex flex-col items-center ${actionCooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => handleAction('alliance')}
          disabled={actionCooldown}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Form Alliance
        </button>
        
        <button
          className={`flex-1 py-2 px-4 rounded ${
            selectedAction === 'upgrade' 
              ? 'bg-purple-500 text-white' 
              : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
          } transition-all flex flex-col items-center ${actionCooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => handleAction('upgrade')}
          disabled={actionCooldown}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          Upgrade NFT
        </button>
      </div>
    </div>
  );
};

export default GameControls; 