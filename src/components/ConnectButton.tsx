'use client';

import { useAppKit } from '@reown/appkit/react';
import { useAccount, useEnsName, useEnsAvatar, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { normalize } from 'viem/ens';

interface ConnectButtonProps {
  className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Simple ENS resolution like other components
  const { data: ensName } = useEnsName({
    address: address,
    chainId: 1,
  });
  
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: 1,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className={className}>
        Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
    
    return (
      <div className="relative">
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center gap-3 ${className}`}
        >
          {/* ENS Avatar or default avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-green-500/30 flex items-center justify-center">
            {ensAvatar ? (
              <img 
                src={ensAvatar} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-green-400 text-sm font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          {/* Display name */}
          <div className="text-green-400 font-semibold">
            {displayName}
          </div>
          
          {/* Connection indicator */}
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          
          {/* Dropdown arrow */}
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-green-500/30 rounded-lg shadow-lg z-50">
            <button
              onClick={() => {
                open();
                setShowDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-green-400 hover:bg-green-500/20 rounded-t-lg transition-colors"
            >
              Account Details
            </button>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/20 rounded-b-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
        
        {/* Click outside to close dropdown */}
        {showDropdown && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>
    );
  }

  return (
    <button 
      onClick={() => open()}
      className={className}
    >
      Connect Wallet
    </button>
  );
} 