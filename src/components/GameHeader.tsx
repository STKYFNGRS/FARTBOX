'use client';

import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';
import { Avatar } from 'ethereum-identity-kit';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface GameHeaderProps {
  isWalletConnected: boolean;
}

function CustomConnectButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // Get ENS data the same way as ProfileCard (which works)
  useEffect(() => {
    if (address) {
      const fetchENSData = async () => {
        try {
          // First try to get from our database (stored values)
          const dbResponse = await fetch(`/api/users/ens/${address}`);
          if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            if (dbData.ens_name) setEnsName(dbData.ens_name);
            if (dbData.ens_avatar) setEnsAvatar(dbData.ens_avatar);
          }
          
          // Also try direct ENS resolution (backup)
          const ensResponse = await fetch(`https://api.ensdata.net/${address}`);
          if (ensResponse.ok) {
            const ensData = await ensResponse.json();
            if (ensData.ens) setEnsName(ensData.ens);
            if (ensData.avatar) setEnsAvatar(ensData.avatar);
          }
        } catch (error) {
          console.log('ENS lookup failed:', error);
        }
      };
      fetchENSData();
    }
  }, [address]);

  // Calculate dropdown position
  const handleButtonClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setShowDropdown(!showDropdown);
  };

  if (!isConnected || !address) {
    return (
      <button
        onClick={() => open()}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
      >
        Connect Wallet
      </button>
    );
  }

  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  const fallbackLetter = displayName.charAt(0).toUpperCase();

  const dropdown = showDropdown && (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998]" 
        onClick={() => setShowDropdown(false)}
      />
      
      {/* Dropdown */}
      <div 
        className="fixed z-[9999] w-64 bg-gray-800 border border-green-500/30 rounded-lg shadow-lg"
        style={{
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
        }}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-green-500/30 flex items-center justify-center border border-green-500/50">
              {ensAvatar ? (
                <img 
                  src={ensAvatar} 
                  alt={`${displayName} avatar`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<span class="text-green-400 font-bold">${fallbackLetter}</span>`;
                    }
                  }}
                />
              ) : (
                <span className="text-green-400 font-bold">
                  {fallbackLetter}
                </span>
              )}
            </div>
            <div>
              <div className="text-white font-medium">{displayName}</div>
              <div className="text-xs text-gray-400">{address}</div>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <button
            onClick={() => {
              open();
              setShowDropdown(false);
            }}
            className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded transition-colors"
          >
            Account Settings
          </button>
          <button
            onClick={() => {
              disconnect();
              setShowDropdown(false);
            }}
            className="w-full text-left px-3 py-2 text-red-400 hover:bg-gray-700 rounded transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative">
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-green-500/30 rounded-lg transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden bg-green-500/30 flex items-center justify-center border border-green-500/50">
          {ensAvatar ? (
            <img 
              src={ensAvatar} 
              alt={`${displayName} avatar`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<span class="text-green-400 text-xs font-bold">${fallbackLetter}</span>`;
                }
              }}
            />
          ) : (
            <span className="text-green-400 text-xs font-bold">
              {fallbackLetter}
            </span>
          )}
        </div>
        
        {/* Name */}
        <div className="text-left">
          <div className="text-white font-medium">{displayName}</div>
          <div className="text-xs text-gray-400">{address.slice(0, 8)}...{address.slice(-6)}</div>
        </div>
        
        {/* Dropdown Arrow */}
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Render dropdown in portal */}
      {typeof window !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
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
        
        {/* Custom connect button with working ENS */}
        <CustomConnectButton />
      </div>
    </header>
  );
} 