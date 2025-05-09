import { useState, useEffect } from 'react';
import { useAppKit } from '@reown/appkit/react';

interface GameBoardProps {
  isWalletConnected: boolean;
}

export default function GameBoard({ isWalletConnected }: GameBoardProps) {
  return (
    <div className="flex-1 relative flex items-center justify-center p-6">
      {!isWalletConnected ? (
        <WelcomeScreen />
      ) : (
        <BoardGame />
      )}
    </div>
  );
}

function WelcomeScreen() {
  const { open: openAppKitModal } = useAppKit();

  return (
    <div className="max-w-md p-8 gas-container rounded-2xl gas-glow text-center">
      <h2 className="text-3xl font-extrabold gas-text mb-6">
        Welcome to Fart.box: Gas Dominance
      </h2>
      <p className="text-gray-300 mb-8">
        Connect your wallet to join the most explosive territorial game on the Base network. 
        Mint your Player NFT, conquer territories with your unique gas, and rise to the top of the leaderboard!
      </p>
      <div className="flex flex-col space-y-4 items-center">
        <button 
          onClick={() => openAppKitModal()}
          className="gas-button px-8 py-3 text-base"
        >
          Connect Wallet to Play
        </button>
        <div className="flex gap-8 mt-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-lg mb-2 flex items-center justify-center gas-glow">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="M12 2v8L8.5 7.5 5 10V2zm-4 10.29C7 13.82 7 16.94 7 19c0 1 .03 1 1 1h8c.97 0 1 0 1-1 0-2.06 0-5.18-1-6.71a5.01 5.01 0 0 0-8 0z"/></svg>
            </div>
            <span className="text-sm text-gray-300">Mint NFT</span>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-lg mb-2 flex items-center justify-center gas-glow">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <span className="text-sm text-gray-300">Play Game</span>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-lg mb-2 flex items-center justify-center gas-glow">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M17.6 9.12a5.58 5.58 0 0 0-5.6-5.1c-2.7 0-5 1.9-5.5 4.5a4.52 4.52 0 0 0-2.5 4 4.5 4.5 0 0 0 4.5 4.5h9a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-3.4-4.4z"/><path d="m12.5 14.5-2 2 2 2"/><path d="m13.5 18.5 2-2-2-2"/></svg>
            </div>
            <span className="text-sm text-gray-300">Form Alliances</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardGame() {
  const [territories, setTerritories] = useState<Array<{ owner: string | null }>>([]);
  
  useEffect(() => {
    const owners = [null, 'green', 'yellow', 'blue', 'red'];
    const newTerritories = Array.from({ length: 64 }).map(() => ({
      owner: owners[Math.floor(Math.random() * owners.length)]
    }));
    setTerritories(newTerritories);
  }, []);
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-3xl aspect-square relative rounded-xl overflow-hidden gas-container gas-glow">
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
          {territories.map((territory, i) => {
            const { owner } = territory;
            return (
              <div 
                key={i} 
                className={`border border-green-500/20 hover:bg-green-500/10 transition-all 
                           ${owner === 'green' ? 'bg-green-500/20' : ''}
                           ${owner === 'yellow' ? 'bg-yellow-500/20' : ''}
                           ${owner === 'blue' ? 'bg-blue-500/20' : ''}
                           ${owner === 'red' ? 'bg-red-500/20' : ''}`}
              >
                {owner && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full 
                                   ${owner === 'green' ? 'bg-green-500/70' : ''}
                                   ${owner === 'yellow' ? 'bg-yellow-500/70' : ''}
                                   ${owner === 'blue' ? 'bg-blue-500/70' : ''}
                                   ${owner === 'red' ? 'bg-red-500/70' : ''}`}></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-gradient-radial from-green-500/30 to-transparent animate-pulse"></div>
        <div className="absolute top-1/3 left-1/3 w-24 h-24 rounded-full bg-gradient-radial from-yellow-500/30 to-transparent animate-pulse"></div>
      </div>
    </div>
  );
} 