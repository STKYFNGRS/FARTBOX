'use client';

import { useAccount, useEnsName, useEnsAvatar } from 'wagmi';
import { normalize } from 'viem/ens';
import { ConnectButton } from './ConnectButton';

interface GameHeaderProps {
  isWalletConnected: boolean;
}

export default function GameHeader({ isWalletConnected }: GameHeaderProps) {
  const { address, isConnected } = useAccount();
  
  // Get ENS name and avatar
  const { data: ensName } = useEnsName({
    address: address,
    chainId: 1, // Mainnet for ENS
  });
  
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: 1,
  });

  const displayName = ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '');

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
        
        {isConnected && address ? (
          <div className="flex items-center gap-3 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            {/* ENS Avatar or default avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-green-500/30 flex items-center justify-center">
              {ensAvatar ? (
                <img 
                  src={ensAvatar} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to default avatar on error
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-green-400 text-sm font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            {/* Display name (ENS or shortened address) */}
            <div className="text-green-400 font-semibold">
              {displayName}
            </div>
            
            {/* Connection indicator */}
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <ConnectButton className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors" />
        )}
      </div>
    </header>
  );
} 