'use client';

import { useState, useEffect } from 'react';
import { useAccount, useEnsName, useEnsAvatar } from 'wagmi';
import { normalize } from 'viem/ens';
import { ProfileCard } from 'ethereum-identity-kit';

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
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Re-enable ENS resolution using same approach as ethereum-identity-kit ProfileCard
  const { data: ensName } = useEnsName({
    address: player.wallet_address as `0x${string}`,
    chainId: 1, // Ethereum mainnet for ENS
  });
  
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: 1,
  });

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-green-500/30 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        
        {/* ENS Profile Card */}
        <div className="mb-6">
          <h3 className="text-green-400 font-bold text-lg mb-4">Player Profile</h3>
          
          {/* Identity Kit Profile Card with error boundary */}
          <div className="rounded-lg overflow-hidden bg-gray-800/50 min-h-[200px] relative">
            <div className="w-full p-4">
              <div className="identity-kit-profile-card">
                <ProfileCard addressOrName={player.wallet_address as `0x${string}`} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Game Statistics */}
        {loading ? (
          <div className="text-center text-gray-400 py-4">
            Loading game stats...
          </div>
        ) : profileData && profileData.stats ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 rounded-lg space-y-3">
              <h4 className="text-sm font-medium text-green-400">Game Statistics</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center p-2 bg-black/20 rounded">
                  <div className="text-green-400 font-bold">{profileData.stats?.totalGames || 0}</div>
                  <div className="text-xs text-gray-400">Games</div>
                </div>
                <div className="text-center p-2 bg-black/20 rounded">
                  <div className="text-green-400 font-bold">{profileData.stats?.wins || 0}</div>
                  <div className="text-xs text-gray-400">Wins</div>
                </div>
                <div className="text-center p-2 bg-black/20 rounded">
                  <div className="text-green-400 font-bold">{profileData.stats?.winRate || 0}%</div>
                  <div className="text-xs text-gray-400">Win Rate</div>
                </div>
                <div className="text-center p-2 bg-black/20 rounded">
                  <div className="text-yellow-400 font-bold">{profileData.stats?.totalTokens || 0}</div>
                  <div className="text-xs text-gray-400">$TOOT</div>
                </div>
              </div>
              
              {/* Level and XP */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Level {profileData.stats?.level || 1}</span>
                <div className="w-24 h-2 bg-green-900/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-400" 
                    style={{ width: `${(profileData.stats?.xpProgress || 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Achievements */}
            {profileData?.achievements?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-md font-medium text-green-400">Achievements</h4>
                <div className="grid grid-cols-1 gap-2">
                  {profileData.achievements.map((achievement: any, i: number) => (
                    <div key={i} className="p-2 bg-green-500/10 rounded-lg flex items-center">
                      <span className="text-lg mr-2">{achievement.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{achievement.name}</div>
                        <div className="text-xs text-gray-400">{achievement.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Games */}
            {profileData?.recentGames?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-md font-medium text-green-400">Recent Games</h4>
                <div className="space-y-2">
                  {profileData.recentGames.slice(0, 3).map((game: any, i: number) => (
                    <div key={i} className="p-2 bg-green-500/10 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="text-sm">Game #{game.game_id}</div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          game.placement === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                          game.placement <= 3 ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          #{game.placement}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {game.territories_final} territories • +{game.tokens_earned} $TOOT
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-4">
            <p>No game statistics available yet.</p>
            <p className="text-sm">This player hasn't completed any games.</p>
          </div>
        )}
        
        {/* Player Status */}
        <div className="mt-6 space-y-3">
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
  // Re-enable ENS resolution using same approach as ethereum-identity-kit
  const { data: ensName } = useEnsName({
    address: player.wallet_address as `0x${string}`,
    chainId: 1, // Ethereum mainnet for ENS
  });
  
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: 1,
  });

  // Use live ENS data first (like ProfileCard does), fallback to stored data
  const displayName = ensName || player.ens_name || player.username || 
    `${player.wallet_address.slice(0, 6)}...${player.wallet_address.slice(-4)}`;
  
  const avatarSrc = ensAvatar || player.ens_avatar;
  const fallbackLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-green-500/30 flex items-center justify-center border border-green-500/50">
      {avatarSrc ? (
        <img 
          src={avatarSrc} 
          alt={`${displayName} avatar`}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            // Show fallback letter when image fails
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
  );
}

function PlayerListItem({ player, isCurrentUser, onPlayerClick }: { 
  player: OnlinePlayer; 
  isCurrentUser: boolean; 
  onPlayerClick: (player: OnlinePlayer) => void;
}) {
  // Use live ENS data first if available (like ProfileCard does), fallback to stored
  const { data: ensName } = useEnsName({
    address: player.wallet_address as `0x${string}`,
    chainId: 1,
  });
  
  const displayName = ensName || player.ens_name || player.username || 
    `${player.wallet_address.slice(0, 6)}...${player.wallet_address.slice(-4)}`;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
        isCurrentUser 
          ? 'bg-green-500/20 border border-green-500/50' 
          : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 hover:border-green-500/30'
      }`}
      onClick={() => onPlayerClick(player)}
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
    // Allow clicking on any player for testing modal functionality
    setSelectedPlayer(player);
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
              
              return (
                <PlayerListItem
                  key={player.id}
                  player={player}
                  isCurrentUser={isCurrentUser}
                  onPlayerClick={handlePlayerClick}
                />
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