import { useState, useEffect } from 'react';

export interface GameControlsProps {
  isWalletConnected: boolean;
  gameId?: string;
  playerId?: number;
  onActionSelect?: (action: string | null) => void;
  gameState?: {
    gasUnits: number;
    lastActionTime?: string;
  };
  onGameStateUpdate?: () => void;
}

const GameControls = ({ 
  isWalletConnected, 
  gameId, 
  playerId,
  onActionSelect,
  gameState,
  onGameStateUpdate
}: GameControlsProps) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<{[key: string]: number}>({});
  const [actionMessage, setActionMessage] = useState<string>('');

  // Action configurations
  const actions = {
    emit: {
      name: 'Release Gas',
      cost: 10,
      cooldown: 5, // Simple 5-second spam prevention
      color: 'green',
      icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
      description: 'Quick attack or expansion (10 gas, 5s cooldown)'
    },
    bomb: {
      name: 'Gas Bomb',
      cost: 25,
      cooldown: 5, // Same cooldown for all actions
      color: 'red',
      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
      description: 'Powerful area attack (25 gas, 5s cooldown)'
    },
    defend: {
      name: 'Boost Defense',
      cost: 15,
      cooldown: 5, // Same cooldown for all actions
      color: 'blue',
      icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
      description: 'Temporarily boost territory defense (15 gas, 5s cooldown)'
    }
  };

  // Update cooldowns every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(action => {
          if (updated[action] > 0) {
            updated[action] -= 1;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate cooldowns based on last action time
  useEffect(() => {
    if (gameState?.lastActionTime) {
      const lastAction = new Date(gameState.lastActionTime);
      const now = new Date();
      const timeDiffMs = now.getTime() - lastAction.getTime();
      const timeSinceLastAction = Math.floor(timeDiffMs / 1000);
      
      // Debug logging for suspicious cooldown times
      console.log('🕐 GameControls cooldown calculation:', {
        lastActionTime: gameState.lastActionTime,
        lastAction: lastAction.toISOString(),
        now: now.toISOString(),
        timeDiffMs,
        timeSinceLastAction
      });

      // Only apply cooldowns if the timestamp makes sense (not in future, not too old)
      if (timeSinceLastAction >= 0 && timeSinceLastAction < 300) { // Only apply if within last 5 minutes
        const newCooldowns: {[key: string]: number} = {};
        Object.entries(actions).forEach(([key, action]) => {
          const remaining = Math.max(0, action.cooldown - timeSinceLastAction);
          if (remaining > 0) {
            newCooldowns[key] = remaining;
          }
        });
        setCooldowns(newCooldowns);
      } else {
        // Clear cooldowns if timestamp is invalid or too old
        console.log('🔄 Clearing cooldowns due to invalid/old timestamp');
        setCooldowns({});
      }
    }
  }, [gameState?.lastActionTime]);

  const handleActionSelect = (actionKey: string) => {
    if (cooldowns[actionKey] > 0) return;
    if (!gameState || gameState.gasUnits < actions[actionKey as keyof typeof actions].cost) return;

    // Toggle action selection
    const newAction = selectedAction === actionKey ? null : actionKey;
    setSelectedAction(newAction);
    onActionSelect?.(newAction);

    if (newAction) {
      setActionMessage(`${actions[actionKey as keyof typeof actions].name} selected. Click a highlighted tile to execute.`);
    } else {
      setActionMessage('');
    }
  };

  // Clear action message when action is deselected from parent
  useEffect(() => {
    if (!selectedAction) {
      setActionMessage('');
    }
  }, [selectedAction]);

  if (!isWalletConnected) {
    return null;
  }
  
  return (
    <div className="p-4 bg-black/40 backdrop-blur-md border-t border-green-500/20">
      {/* Action Message */}
      {actionMessage && (
        <div className="mb-3 text-center text-sm text-yellow-300 bg-black/50 p-2 rounded">
          {actionMessage}
        </div>
      )}

      {/* Gas Display */}
      {gameState && (
        <div className="mb-3 text-center">
          <div className="text-lg font-bold text-green-400">
            Gas: {gameState.gasUnits}
          </div>
        </div>
      )}
      
      <div className="flex justify-between gap-3">
        {Object.entries(actions).map(([key, action]) => {
          const isSelected = selectedAction === key;
          const isOnCooldown = cooldowns[key] > 0;
          const canAfford = gameState ? gameState.gasUnits >= action.cost : true;
          const isDisabled = isOnCooldown || !canAfford;

          return (
            <button
              key={key}
              className={`flex-1 py-3 px-2 rounded transition-all text-sm ${
                isSelected
                  ? `bg-${action.color}-500 text-white shadow-lg scale-105` 
                  : isDisabled
                    ? `bg-gray-600/20 text-gray-500 cursor-not-allowed`
                    : `bg-${action.color}-500/20 text-${action.color}-400 hover:bg-${action.color}-500/30 hover:scale-102`
              } flex flex-col items-center relative`}
              onClick={() => handleActionSelect(key)}
              disabled={isDisabled}
              title={action.description}
            >
              {/* Cooldown Overlay */}
              {isOnCooldown && (
                <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center">
                  <span className="text-white font-bold">{cooldowns[key]}s</span>
                </div>
              )}

              {/* Icon */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 mb-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={action.icon} 
                />
              </svg>
              
              {/* Name and Cost */}
              <div className="text-center">
                <div className="font-semibold">{action.name}</div>
                <div className="text-xs opacity-75">
                  {action.cost} gas
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Help */}
      <div className="mt-3 text-xs text-gray-400 text-center">
        {selectedAction ? (
          <span>Click a highlighted tile to execute your action</span>
        ) : (
          <span>Select an action above, then click adjacent tiles</span>
        )}
      </div>
    </div>
  );
};

export default GameControls; 