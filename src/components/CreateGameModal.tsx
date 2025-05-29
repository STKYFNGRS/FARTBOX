'use client';

import { useState } from 'react';

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGameCreated: (gameId: string) => void;
}

interface GameOptions {
  maxPlayers: number;
  includeBots: boolean;
  botCount: number;
  gameDuration: number;
}

export default function CreateGameModal({ isOpen, onClose, onGameCreated }: CreateGameModalProps) {
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    maxPlayers: 6,
    includeBots: true,
    botCount: 3,
    gameDuration: 20
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createGame = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameOptions)
      });
      
      const data = await response.json();
      
      if (data.success) {
        onGameCreated(data.gameId);
      } else {
        setError(data.error || 'Failed to create game');
      }
    } catch (err) {
      setError('Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900/95 border border-green-500/30 rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-green-400 mb-6">Create New Game</h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Max Players</label>
            <select 
              className="w-full bg-black/50 border border-green-500/30 rounded p-3 text-white focus:outline-none focus:border-green-500/50"
              value={gameOptions.maxPlayers}
              onChange={(e) => setGameOptions({...gameOptions, maxPlayers: parseInt(e.target.value)})}
            >
              <option value="2">2 Players</option>
              <option value="4">4 Players</option>
              <option value="6">6 Players</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Game Duration</label>
            <select
              className="w-full bg-black/50 border border-green-500/30 rounded p-3 text-white focus:outline-none focus:border-green-500/50"
              value={gameOptions.gameDuration}
              onChange={(e) => setGameOptions({...gameOptions, gameDuration: parseInt(e.target.value)})}
            >
              <option value="15">15 Minutes - Quick Battle</option>
              <option value="20">20 Minutes - Standard</option>
              <option value="30">30 Minutes - Extended</option>
            </select>
          </div>
          
          <div className="bg-black/30 p-4 rounded-lg border border-green-500/20">
            <div className="flex items-center mb-3">
              <input 
                type="checkbox"
                id="includeBots"
                className="mr-3 w-4 h-4 accent-green-500"
                checked={gameOptions.includeBots}
                onChange={(e) => setGameOptions({...gameOptions, includeBots: e.target.checked})}
              />
              <label htmlFor="includeBots" className="text-gray-300 font-semibold">Include AI Players</label>
            </div>
            
            {gameOptions.includeBots && (
              <div>
                <label className="block text-gray-400 mb-2 text-sm">Number of AI Players</label>
                <select 
                  className="w-full bg-black/50 border border-green-500/30 rounded p-2 text-white text-sm focus:outline-none focus:border-green-500/50"
                  value={gameOptions.botCount}
                  onChange={(e) => setGameOptions({...gameOptions, botCount: parseInt(e.target.value)})}
                >
                  {Array.from({length: gameOptions.maxPlayers - 1}, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} AI Player{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
            <h4 className="text-yellow-400 font-semibold mb-2">Game Features:</h4>
            <ul className="text-yellow-300 text-sm space-y-1">
              <li>• Turn-based gameplay with 5-second spam protection</li>
              <li>• Random map generation each game</li>
              <li>• Strategic gas types: Green, Yellow, Toxic</li>
              <li>• Victory at 40+ territories (42% of map)</li>
            </ul>
          </div>
          
          <div className="flex justify-end gap-4 pt-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 border border-gray-600/30 rounded transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              onClick={createGame}
              className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded transition-colors font-semibold"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 