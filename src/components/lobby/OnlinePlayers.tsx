'use client';

import { useState, useEffect } from 'react';
import { useAccount, useEnsName, useEnsAvatar } from 'wagmi';
import { normalize } from 'viem/ens';

interface OnlinePlayer {
  id: number;
  wallet_address: string;
  username?: string;
  ens_name?: string;
  ens_avatar?: string;
  last_active: string;
}

interface PlayerProfileModalProps {
  player: OnlinePlayer;
  isOpen: boolean;
  onClose: () => void;
}

function PlayerProfileModal({ player, isOpen, onClose }: PlayerProfileModalProps) {
  const { data: ensName, error: ensNameError } = useEnsName({
    address: player.wallet_address as `0x${string}`,
    chainId: 1,
    query: {
      enabled: !!player.wallet_address && isOpen, // Only fetch when modal is open
      retry: 1,
      staleTime: 300000, // 5 minutes cache
    }
  });
  
  const { data: ensAvatar, error: ensAvatarError } = useEnsAvatar({
    name: (ensName || player.ens_name) ? normalize(ensName || player.ens_name!) : undefined,
    chainId: 1,
    query: {
      enabled: !!(ensName || player.ens_name) && !player.ens_avatar, // Only fetch if not cached
      retry: 1,
      staleTime: 300000,
    }
  });

  if (!isOpen) return null;

  // Debug ENS errors
  if (ensNameError || ensAvatarError) {
    console.log('ENS errors in PlayerProfileModal:', { ensNameError, ensAvatarError });
  }

  const displayName = ensName || player.ens_name || player.username || 
    `${player.wallet_address.slice(0, 6)}...${player.wallet_address.slice(-4)}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-green-500/30 rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-green-500/30 flex items-center justify-center">
            {ensAvatar || player.ens_avatar ? (
              <img 
                src={ensAvatar || player.ens_avatar} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-green-400 text-xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-green-400 font-bold text-lg">{displayName}</h3>
            <p className="text-gray-400 text-sm">
              {player.wallet_address.slice(0, 8)}...{player.wallet_address.slice(-8)}
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Status:</span>
            <span className="text-green-400">Online</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Last Active:</span>
            <span className="text-gray-300">
              {new Date(player.last_active).toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function PlayerAvatar({ player }: { player: OnlinePlayer }) {
  // Use cached ENS data from database first, only fallback to network if needed
  const { data: ensName, error: ensNameError } = useEnsName({
    address: player.wallet_address as `0x${string}`,
    chainId: 1,
    query: {
      enabled: !!player.wallet_address && !player.ens_name, // Only fetch if not cached
      retry: 1,
      staleTime: 600000, // 10 minutes cache for avatars
    }
  });
  
  const { data: ensAvatar, error: ensAvatarError } = useEnsAvatar({
    name: (ensName || player.ens_name) ? normalize(ensName || player.ens_name!) : undefined,
    chainId: 1,
    query: {
      enabled: !!(ensName || player.ens_name) && !player.ens_avatar, // Only fetch if not cached
      retry: 1,
      staleTime: 600000,
    }
  });

  // Use cached data preferentially
  const displayName = player.ens_name || ensName || player.username || 
    `${player.wallet_address.slice(0, 6)}...${player.wallet_address.slice(-4)}`;
  
  const avatarSrc = player.ens_avatar || ensAvatar;

  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-green-500/30 flex items-center justify-center">
      {avatarSrc ? (
        <img 
          src={avatarSrc} 
          alt="Profile" 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="text-green-400 text-xs font-bold">
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function OnlinePlayers() {
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<OnlinePlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();

  const fetchOnlinePlayers = async () => {
    try {
      const response = await fetch('/api/users/online');
      if (response.ok) {
        const players = await response.json();
        console.log('👥 Fetched online players:', players);
        
        // Ensure we always show players even if ENS is failing
        if (Array.isArray(players) && players.length > 0) {
          setOnlinePlayers(players);
        } else {
          console.warn('No players data received or invalid format:', players);
        }
      } else {
        console.error('Failed to fetch online players:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching online players:', error);
      // Show connection issues in UI but don't break the component
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlinePlayers();
    const interval = setInterval(fetchOnlinePlayers, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handlePlayerClick = (player: OnlinePlayer) => {
    if (player.wallet_address !== address) {
      setSelectedPlayer(player);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-4">
        <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Online Players
        </h3>
        <div className="text-gray-400 text-center py-8">
          Loading players...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-4">
        <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Online Players ({onlinePlayers.length})
        </h3>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {onlinePlayers.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              No players online
            </div>
          ) : (
            onlinePlayers.map((player) => {
              const isCurrentUser = player.wallet_address === address;
              const displayName = player.ens_name || player.username || 
                `${player.wallet_address.slice(0, 6)}...${player.wallet_address.slice(-4)}`;
              
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                    isCurrentUser 
                      ? 'bg-green-500/20 border border-green-500/50' 
                      : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 hover:border-green-500/30'
                  }`}
                  onClick={() => handlePlayerClick(player)}
                >
                  <PlayerAvatar player={player} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate ${
                        isCurrentUser ? 'text-green-300' : 'text-gray-300'
                      }`}>
                        {displayName}
                        {isCurrentUser && <span className="text-green-400 text-sm ml-1">(You)</span>}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {player.wallet_address.slice(0, 8)}...{player.wallet_address.slice(-6)}
                    </div>
                  </div>
                  
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          isOpen={true}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  );
} 