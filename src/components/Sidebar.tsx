import React, { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { ProfileCard, Avatar, FollowButton, ProfileStats } from 'ethereum-identity-kit';

// Define ActiveTab locally since it was removed from page.tsx
export type ActiveTab = 'leaderboard' | 'profile' | 'help' | 'chat';

export interface SidebarProps {
  isOpen: boolean;
  activeTab: ActiveTab;
  setActiveTab: Dispatch<SetStateAction<ActiveTab>>;
  isWalletConnected: boolean;
  gameId?: string; // Optional for backward compatibility
}

const Sidebar = ({ isOpen, activeTab, setActiveTab, isWalletConnected, gameId }: SidebarProps) => {
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();
  
  // Load leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const url = gameId 
          ? `/api/leaderboard?gameId=${gameId}`
          : `/api/leaderboard`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.players) {
          setLeaderboardData(data.players);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [gameId]);
  
  // Load profile data when wallet is connected
  useEffect(() => {
    const fetchProfile = async () => {
      if (!address) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/profile?walletAddress=${address}`);
        const data = await response.json();
        
        if (!response.ok) {
          // Player doesn't exist yet, that's fine for new players
          setProfileData(null);
        } else {
          setProfileData(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isWalletConnected && address) {
      fetchProfile();
    }
  }, [isWalletConnected, address]);
  
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
              className={`flex-1 p-2 text-xs font-medium ${activeTab === 'leaderboard' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              Ranks
            </button>
            <button 
              className={`flex-1 p-2 text-xs font-medium ${activeTab === 'profile' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button 
              className={`flex-1 p-2 text-xs font-medium ${activeTab === 'help' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('help')}
            >
              Rules
            </button>
            <button 
              className={`flex-1 p-2 text-xs font-medium ${activeTab === 'chat' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
          </div>
          
          {/* Sidebar Content based on active tab */}
          <div className="p-4 h-full overflow-y-auto">
            {activeTab === 'leaderboard' && <LeaderboardTab leaderboardData={leaderboardData} loading={loading} gameId={gameId} />}
            {activeTab === 'profile' && <ProfileTab isWalletConnected={isWalletConnected} profileData={profileData} loading={loading} />}
            {activeTab === 'help' && <HelpTab />}
            {activeTab === 'chat' && <ChatTab isWalletConnected={isWalletConnected} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function LeaderboardTab({ leaderboardData, loading, gameId }: { leaderboardData: any[], loading: boolean, gameId?: string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-green-400">
        {gameId ? 'Current Game Rankings' : 'Global Leaderboard'}
      </h3>
      {loading ? (
        <p className="text-gray-400">Loading leaderboard data...</p>
      ) : !leaderboardData.length ? (
        <p className="text-gray-400">No players found</p>
      ) : (
        <div className="space-y-2">
          {leaderboardData.map((player, index) => (
            <div key={player.id || index} className="flex items-center p-2 bg-green-500/10 rounded">
              <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center mr-3">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {player.display_name || player.username || `Player ${player.id}`}
                  {player.is_bot && <span className="text-xs text-gray-500 ml-1">(AI)</span>}
                </div>
                <div className="text-xs text-gray-400">{player.short_address}</div>
              </div>
              <div className="text-green-400 font-bold text-sm">
                {gameId ? (
                  <div className="text-right">
                    <div>{player.territories_count || 0} territories</div>
                    <div className="text-xs text-gray-400">{player.gas_units || 0} gas</div>
                  </div>
                ) : (
                  <div className="text-right">
                    <div>{player.wins || 0} wins</div>
                    <div className="text-xs text-gray-400">{player.win_rate || 0}% rate</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ isWalletConnected, profileData, loading }: { isWalletConnected: boolean, profileData: any, loading: boolean }) {
  const { open: openAppKitModal } = useAppKit();
  const { address, chain } = useAccount();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-green-400">My Profile</h3>
      {loading ? (
        <p className="text-gray-400">Loading profile data...</p>
      ) : isWalletConnected && address ? (
        <>
          {/* Ethereum Identity Kit Profile Card */}
          <div className="rounded-lg overflow-hidden">
            <ProfileCard addressOrName={address} />
          </div>

          {/* Game-specific stats if we have profile data */}
          {profileData && (
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
          )}
          
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
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400/50"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"></path><path d="M15 9H9V15H15V9Z"></path></svg>
          <div className="text-sm text-gray-400 text-center">
            Connect your wallet to view your profile
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

function HelpTab() {
  return (
    <div className="space-y-4 text-sm">
      <h3 className="text-lg font-medium text-green-400">How to Play</h3>
      
      <div className="space-y-3">
        <div>
          <h4 className="text-green-400 font-medium mb-2">🎯 Objective</h4>
          <p className="text-gray-300">Control 20+ territories to achieve dominance victory!</p>
        </div>
        
        <div>
          <h4 className="text-green-400 font-medium mb-2">💨 Gas Types</h4>
          <div className="space-y-1 text-gray-300">
            <div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded mr-2"></span>Green: Balanced offense & defense</div>
            <div className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded mr-2"></span>Yellow: High offense, weak defense</div>
            <div className="flex items-center"><span className="w-3 h-3 bg-purple-500 rounded mr-2"></span>Toxic: Strong defense, low offense</div>
          </div>
        </div>
        
        <div>
          <h4 className="text-green-400 font-medium mb-2">⚡ Actions</h4>
          <div className="space-y-2 text-gray-300">
            <div>
              <div className="font-medium text-green-400">Release Gas (10 gas, 10s cooldown)</div>
              <div className="text-xs">Attack or claim adjacent territories</div>
            </div>
            <div>
              <div className="font-medium text-red-400">Gas Bomb (25 gas, 45s cooldown)</div>
              <div className="text-xs">Powerful area attack affecting target + adjacent tiles</div>
            </div>
            <div>
              <div className="font-medium text-blue-400">Boost Defense (15 gas, 30s cooldown)</div>
              <div className="text-xs">Temporarily fortify owned territories</div>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-green-400 font-medium mb-2">🎮 Strategy Tips</h4>
          <ul className="text-gray-300 text-xs space-y-1 list-disc list-inside">
            <li>Control gas vents (red dots) for strategic advantages</li>
            <li>Expand efficiently - claimed territories must be adjacent to yours</li>
            <li>Use defensive actions to protect key territories</li>
            <li>Balance offense and resource management</li>
            <li>Watch for enemy weaknesses and exploit them</li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-green-400 font-medium mb-2">🏆 Rewards</h4>
          <div className="text-gray-300 text-xs space-y-1">
            <div>• Win games to earn $TOOT tokens and XP</div>
            <div>• Top 3 finishes unlock achievements</div>
            <div>• Level up to unlock new features</div>
          </div>
        </div>
      </div>
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