'use client';

import { ConnectButton } from './ConnectButton';

interface GameHeaderProps {
  isWalletConnected: boolean;
}

export default function GameHeader({ isWalletConnected }: GameHeaderProps) {
  return (
    <header className="relative z-10 flex justify-between items-center p-4 gas-container border-b border-green-500/30">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-extrabold gas-text">
          FART.BOX
        </h1>
        <span className="text-sm px-2 py-1 rounded bg-green-500/20 text-green-400 font-semibold">
          GAS DOMINANCE
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-yellow-900/30 text-yellow-500 text-xs font-medium border border-yellow-900/30">
            SEASON 1 • COMING SOON
          </div>
        </div>
        
        <ConnectButton className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors" />
      </div>
    </header>
  );
} 