import { useEffect, useState } from 'react';

export interface GameBoardProps {
  isWalletConnected: boolean;
  gameId?: string;
  territories?: any[];
  playerId?: number;
  selectedAction?: string;
  onTileAction?: (x: number, y: number, action: string) => void;
  gameState?: {
    gasUnits: number;
    lastActionTime?: string;
  };
  actionResult?: {
    success: boolean;
    message: string;
    timestamp: number;
  } | null;
}

interface GridCell {
  owner: string | null;
  color: string;
  power: number;
  isVent: boolean;
  x: number;
  y: number;
}

const GameBoard = ({ 
  isWalletConnected, 
  gameId, 
  territories = [], 
  playerId,
  selectedAction,
  onTileAction,
  gameState,
  actionResult
}: GameBoardProps) => {
  const [gridSize, setGridSize] = useState({ rows: 7, cols: 7 });
  const [grid, setGrid] = useState<Array<Array<GridCell>>>([]);
  const [selectedTile, setSelectedTile] = useState<{x: number, y: number} | null>(null);
  const [validMoves, setValidMoves] = useState<Array<{x: number, y: number}>>([]);
  
  // Initialize the grid
  useEffect(() => {
    console.log('Rendering game board with territories:', territories);
    
    // Create an empty grid
    const emptyGrid: Array<Array<GridCell>> = [];
    
    for (let y = 0; y < gridSize.rows; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < gridSize.cols; x++) {
        row.push({
          owner: null,
          color: 'transparent',
          power: 0,
          isVent: false,
          x,
          y
        });
      }
      emptyGrid.push(row);
    }
    
    if (territories && territories.length > 0) {
      // Fill the grid with territory data
      territories.forEach(territory => {
        const x = territory.x_coord;
        const y = territory.y_coord;
        
        if (x >= 0 && x < gridSize.cols && y >= 0 && y < gridSize.rows) {
          emptyGrid[y][x] = {
            owner: territory.owner_id ? String(territory.owner_id) : null,
            color: territory.gas_type || 'green',
            power: territory.defense_bonus || 0,
            isVent: territory.is_gas_vent || false,
            x,
            y
          };
        }
      });
    }
    
    setGrid(emptyGrid);
  }, [gridSize, territories, gameId]);

  // Calculate valid moves when action is selected
  useEffect(() => {
    if (!selectedAction || !playerId) {
      setValidMoves([]);
      return;
    }

    const playerTiles = grid.flat().filter(cell => cell.owner === String(playerId));
    const adjacent = new Set<string>();

    playerTiles.forEach(tile => {
      const adjacentCoords = getAdjacentCoords(tile.x, tile.y);
      adjacentCoords.forEach(coord => {
        if (coord.x >= 0 && coord.x < gridSize.cols && coord.y >= 0 && coord.y < gridSize.rows) {
          adjacent.add(`${coord.x}-${coord.y}`);
        }
      });
    });

    const validMovesArray = Array.from(adjacent).map(coordStr => {
      const [x, y] = coordStr.split('-').map(Number);
      return { x, y };
    });

    setValidMoves(validMovesArray);
  }, [selectedAction, playerId, grid, gridSize]);

  // Helper function for hexagonal adjacency
  const getAdjacentCoords = (x: number, y: number) => {
    const isEvenRow = y % 2 === 0;
    
    if (isEvenRow) {
      return [
        { x: x-1, y: y },    // left
        { x: x+1, y: y },    // right
        { x: x, y: y-1 },    // top-left
        { x: x+1, y: y-1 },  // top-right
        { x: x, y: y+1 },    // bottom-left
        { x: x+1, y: y+1 }   // bottom-right
      ];
    } else {
      return [
        { x: x-1, y: y },    // left
        { x: x+1, y: y },    // right
        { x: x-1, y: y-1 },  // top-left
        { x: x, y: y-1 },    // top-right
        { x: x-1, y: y+1 },  // bottom-left
        { x: x, y: y+1 }     // bottom-right
      ];
    }
  };

  const handleTileClick = (cell: GridCell) => {
    if (!selectedAction || !onTileAction) return;

    const isValidMove = validMoves.some(move => move.x === cell.x && move.y === cell.y);
    
    if (isValidMove) {
      setSelectedTile({ x: cell.x, y: cell.y });
      onTileAction(cell.x, cell.y, selectedAction);
    }
  };

  const isValidMove = (x: number, y: number) => {
    return validMoves.some(move => move.x === x && move.y === y);
  };

  const isPlayerTile = (cell: GridCell) => {
    return cell.owner === String(playerId);
  };

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
    <div className="flex-1 flex flex-col justify-center items-center p-4 overflow-auto">
      {/* Game Status */}
      {gameState && (
        <div className="mb-4 text-center">
          <div className="text-lg text-green-400">Gas Units: {gameState.gasUnits}</div>
          {selectedAction && (
            <div className="text-sm text-yellow-300 mt-2">
              Click a highlighted tile to {selectedAction === 'emit' ? 'attack/claim' : selectedAction === 'bomb' ? 'bomb' : 'defend'}
            </div>
          )}
          {actionResult && Date.now() - actionResult.timestamp < 5000 && (
            <div className={`text-sm mt-2 p-2 rounded ${
              actionResult.success 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {actionResult.message}
            </div>
          )}
        </div>
      )}

      <div className="grid" style={{ 
        display: 'grid',
        gridTemplateColumns: `repeat(${gridSize.cols}, 60px)`,
        gridTemplateRows: `repeat(${gridSize.rows}, 60px)`,
        gap: '4px'
      }}>
        {grid.map((row, rowIndex) => 
          row.map((cell, colIndex) => {
            const isValidMoveCell = isValidMove(cell.x, cell.y);
            const isPlayerOwned = isPlayerTile(cell);
            const isSelected = selectedTile?.x === cell.x && selectedTile?.y === cell.y;
            
            return (
              <div 
                key={`${rowIndex}-${colIndex}`}
                className={`relative flex items-center justify-center transition-all duration-200 ${
                  selectedAction && isValidMoveCell
                    ? 'cursor-pointer hover:scale-110 ring-2 ring-yellow-400 ring-opacity-60' 
                    : cell.owner 
                      ? 'cursor-pointer hover:opacity-80' 
                      : 'cursor-default'
                } ${isSelected ? 'ring-4 ring-white' : ''}`}
                style={{ 
                  backgroundColor: cell.owner ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                  borderRadius: '4px',
                  border: isValidMoveCell
                    ? '3px solid #fbbf24'
                    : cell.owner 
                      ? `2px solid ${
                          cell.color === 'green' ? '#10b981' : 
                          cell.color === 'yellow' ? '#f59e0b' : 
                          cell.color === 'toxic' ? '#8b5cf6' : '#6b7280'
                        }`
                      : '1px solid rgba(255,255,255,0.1)'
                }}
                onClick={() => handleTileClick(cell)}
              >
                {cell.isVent && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                  </div>
                )}
                
                {cell.owner && (
                  <>
                    <div 
                      className="absolute inset-0 rounded-sm opacity-20" 
                      style={{ 
                        backgroundColor: 
                          cell.color === 'green' ? '#10b981' : 
                          cell.color === 'yellow' ? '#f59e0b' : 
                          cell.color === 'toxic' ? '#8b5cf6' : '#6b7280'
                      }}
                    />
                    <span className="text-xs font-bold text-white z-10">
                      {isPlayerOwned ? '●' : cell.owner}
                    </span>
                  </>
                )}

                {isValidMoveCell && selectedAction && (
                  <div className="absolute inset-0 bg-yellow-400 opacity-30 animate-pulse rounded-sm" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        <div className="flex gap-4 justify-center">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            Green (Balanced)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            Yellow (Offensive)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            Toxic (Defensive)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded animate-pulse"></div>
            Gas Vent
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameBoard; 