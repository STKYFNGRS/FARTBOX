'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileCard } from 'ethereum-identity-kit';

interface OnlinePlayer {
  id: number;
  username: string | null;
  wallet_address: string;
  ens_name: string | null;
  ens_avatar: string | null;
  created_at: string;
  last_active: string;
}

interface PlayerProfileModalProps {
  player: OnlinePlayer;
  isOpen: boolean;
  onClose: () => void;
}

// Error boundary for ENS operations to catch CCIP-v2 errors
function withENSErrorBoundary<T extends object>(Component: React.ComponentType<T>) {
  return function ENSErrorBoundaryWrapper(props: T) {
    try {
      return <Component {...props} />;
    } catch (error) {
      console.warn('ENS Error (likely CCIP-v2):', error);
      return <Component {...props} />; // Render without ENS data on error
    }
  };
}

function PlayerProfileModal({ player, isOpen, onClose }: PlayerProfileModalProps) {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);

  // Get ENS data the same way as CustomConnectButton (which works)
  useEffect(() => {
    if (isOpen && player.wallet_address) {
      const fetchENSData = async () => {
        try {
          // First try to get from our database (stored values)
          const dbResponse = await fetch(`/api/users/ens/${player.wallet_address}`);
          if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            if (dbData.ens_name) setEnsName(dbData.ens_name);
            if (dbData.ens_avatar) setEnsAvatar(dbData.ens_avatar);
          }
          
          // Also try direct ENS resolution (backup)
          const ensResponse = await fetch(`https://api.ensdata.net/${player.wallet_address}`);
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
  }, [isOpen, player.wallet_address]);

  // Fetch player's game stats
  useEffect(() => {
    if (isOpen && player.wallet_address) {
      const fetchProfile = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/profile?walletAddress=${player.wallet_address}`);
          if (response.ok) {
            const data = await response.json();
            setProfileData(data);
          }
        } catch (error) {
          console.error('Error fetching player profile:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchProfile();
    }
  }, [isOpen, player.wallet_address]);

  if (!isOpen) {
    return null;
  }

  const displayName = ensName || player.ens_name || player.username || 
    `${player.wallet_address.slice(0, 6)}...${player.wallet_address.slice(-4)}`;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-green-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-bold text-white">Player Profile</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Player Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-green-500/30 flex items-center justify-center border border-green-500/50">
                  {ensAvatar || player.ens_avatar ? (
                    <img 
                      src={ensAvatar || player.ens_avatar || ''} 
                      alt={`${displayName} avatar`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-green-400 text-xl font-bold">${displayName.charAt(0).toUpperCase()}</span>`;
                        }
                      }}
                    />
                  ) : (
                    <span className="text-green-400 text-xl font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{displayName}</h3>
                  <p className="text-sm text-gray-400">{player.wallet_address.slice(0, 10)}...{player.wallet_address.slice(-8)}</p>
                </div>
              </div>

              {/* ENS and ethereum-identity-kit ProfileCard */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/20">
                <h4 className="text-sm font-medium text-green-400 mb-3">Web3 Identity</h4>
                <ProfileCard 
                  addressOrName={player.wallet_address as `0x${string}`}
                />
              </div>

              {/* Game Stats */}
              {profileData && (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/20">
                  <h4 className="text-sm font-medium text-green-400 mb-3">Game Stats</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Games Played</p>
                      <p className="text-lg font-semibold text-white">{profileData.gamesPlayed || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Wins</p>
                      <p className="text-lg font-semibold text-green-400">{profileData.wins || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Win Rate</p>
                      <p className="text-lg font-semibold text-white">
                        {profileData.gamesPlayed > 0 
                          ? `${Math.round((profileData.wins / profileData.gamesPlayed) * 100)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total Gas</p>
                      <p className="text-lg font-semibold text-yellow-400">{profileData.totalGas || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Member Since */}
              <div className="text-center pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-400">
                  Member since {new Date(player.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function PlayerAvatar({ player, onClick }: { player: OnlinePlayer; onClick: (player: OnlinePlayer) => void }) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);

  // Get ENS data the same way as CustomConnectButton (which works)
  useEffect(() => {
    const fetchENSData = async () => {
      try {
        // First try to get from our database (stored values)
        const dbResponse = await fetch(`/api/users/ens/${player.wallet_address}`);
        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          if (dbData.ens_name) setEnsName(dbData.ens_name);
          if (dbData.ens_avatar) setEnsAvatar(dbData.ens_avatar);
        }
        
        // Also try direct ENS resolution (backup)
        const ensResponse = await fetch(`https://api.ensdata.net/${player.wallet_address}`);
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
  }, [player.wallet_address]);

  // Use live ENS data first (like ProfileCard does), fallback to stored data
  const displayName = ensName || player.ens_name || player.username || 
    `${player.wallet_address.slice(0, 6)}...${player.wallet_address.slice(-4)}`;
  
  const avatarSrc = ensAvatar || player.ens_avatar;
  const fallbackLetter = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="cursor-pointer hover:scale-105 transition-transform duration-200"
      onClick={() => onClick(player)}
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-green-500/30 flex items-center justify-center relative border border-green-500/50">
        {avatarSrc ? (
          <img 
            src={avatarSrc} 
            alt={`${displayName} avatar`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="text-green-400 text-sm font-bold">${fallbackLetter}</span>`;
              }
            }}
          />
        ) : (
          <span className="text-green-400 text-sm font-bold">
            {fallbackLetter}
          </span>
        )}
        
        {/* Online indicator */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {displayName}
      </div>
    </div>
  );
}

interface OnlinePlayersProps {
  onPlayerSelect?: (player: OnlinePlayer) => void;
}

const OnlinePlayersComponent = withENSErrorBoundary(function OnlinePlayersInner({ onPlayerSelect }: OnlinePlayersProps) {
  const { address } = useAccount();
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<OnlinePlayer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOnlinePlayers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/users/online');
        if (response.ok) {
          const data = await response.json();
          
          // Ensure unique players by wallet address and filter out invalid entries
          const uniquePlayers = data ? data.filter((player: OnlinePlayer, index: number, arr: OnlinePlayer[]) => 
            player.wallet_address && 
            arr.findIndex(p => p.wallet_address.toLowerCase() === player.wallet_address.toLowerCase()) === index
          ) : [];
          
          setPlayers(uniquePlayers);
        } else {
          console.error('Failed to fetch online players:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching online players:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnlinePlayers();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchOnlinePlayers, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handlePlayerClick = (player: OnlinePlayer) => {
    setSelectedPlayer(player);
    onPlayerSelect?.(player);
  };

  if (loading) {
    return (
      <div className="gas-container p-4 rounded-lg border border-green-500/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="gas-text font-bold">Online Players</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="gas-container p-4 rounded-lg border border-green-500/30">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <h3 className="gas-text font-bold">Online Players ({players.length})</h3>
      </div>
      
      {players.length === 0 ? (
        <p className="text-gray-400 text-sm">No players online</p>
      ) : (
        <div className="space-y-2">
          {players.map((player) => {
            // Prioritize ENS name, then username, then formatted address
            const displayName = player.ens_name || player.username || `${player.wallet_address.slice(0, 6)}...${player.wallet_address.slice(-4)}`;
            
            return (
              <div key={player.wallet_address} className="flex items-center gap-3 group relative">
                <PlayerAvatar player={player} onClick={handlePlayerClick} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {displayName}
                  </div>
                  {/* Only show address if it's different from display name */}
                  {player.ens_name && (
                    <div className="text-xs text-gray-400">
                      {player.wallet_address.slice(0, 8)}...{player.wallet_address.slice(-4)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedPlayer && (
          <PlayerProfileModal
            player={selectedPlayer}
            isOpen={!!selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

export default OnlinePlayersComponent; 