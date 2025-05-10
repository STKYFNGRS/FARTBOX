import { useEffect, useState } from 'react';
import { useAppKit } from '@reown/appkit/react';

export interface GameBoardProps {
  isWalletConnected: boolean;
  gameId?: string; // Optional for backward compatibility
  territories?: any[]; // Will be properly typed once we define territory structure
}

const GameBoard = ({ isWalletConnected, gameId, territories = [] }: GameBoardProps) => {
  const [gridSize, setGridSize] = useState({ rows: 10, cols: 10 });
  const [grid, setGrid] = useState<Array<Array<{ owner: string | null; color: string; power: number }>>>([]);
  
  // Initialize the grid
  useEffect(() => {
    if (territories && territories.length > 0) {
      // If we have territory data, use it to populate the grid
      // This would be implemented based on your territory data structure
      console.log('Using provided territories for game:', gameId);
    } else {
      // Otherwise generate a random grid (for development/testing)
      const newGrid = Array(gridSize.rows).fill(null).map(() => 
        Array(gridSize.cols).fill(null).map(() => {
          const random = Math.random();
          return {
            owner: random > 0.8 ? `player-${Math.floor(random * 10)}` : null,
            color: random > 0.8 ? (random > 0.9 ? 'green' : 'yellow') : 'transparent',
            power: Math.floor(random * 100)
          };
        })
      );
      setGrid(newGrid);
    }
  }, [gridSize, territories, gameId]);
  
  if (!isWalletConnected) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="text-center p-8">
          <h2 className="text-2xl mb-4 text-yellow-300">Connect Wallet to Play</h2>
          <p className="text-gray-400">You need to connect your wallet to view and interact with the game board.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex justify-center items-center p-4 overflow-auto">
      <div className="grid" style={{ 
        display: 'grid',
        gridTemplateColumns: `repeat(${gridSize.cols}, 50px)`,
        gridTemplateRows: `repeat(${gridSize.rows}, 50px)`,
        gap: '2px'
      }}>
        {grid.map((row, rowIndex) => 
          row.map((cell, colIndex) => (
            <div 
              key={`${rowIndex}-${colIndex}`}
              className={`relative flex items-center justify-center ${
                cell.owner 
                  ? 'cursor-pointer hover:opacity-80' 
                  : 'cursor-pointer hover:bg-gray-800/30'
              }`}
              style={{ 
                backgroundColor: cell.owner ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                borderRadius: '4px',
                border: cell.owner ? `2px solid ${cell.color}` : '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {cell.owner && (
                <>
                  <div 
                    className="absolute inset-0 rounded-sm opacity-20" 
                    style={{ backgroundColor: cell.color }}
                  />
                  <span className="text-xs font-bold text-white z-10">{cell.power}</span>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GameBoard; 