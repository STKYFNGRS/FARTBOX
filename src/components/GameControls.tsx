interface GameControlsProps {
  isWalletConnected: boolean;
}

export default function GameControls({ isWalletConnected }: GameControlsProps) {
  if (!isWalletConnected) {
    return null;
  }
  
  return (
    <div className="relative z-10 p-4 gas-container border-t border-green-500/30 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <button className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m10 8 6 4-6 4V8Z"></path></svg>
          Release Gas
        </button>
        <button className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-all flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4V2"></path><path d="M14 22v-2"></path><path d="M10 22v-2"></path><path d="M10 4V2"></path><path d="M7.16 7.17a5 5 0 1 0 1.08 8.27"></path><path d="M20.93 17.69A10 10 0 1 0 3.1 6.33"></path><path d="M8.7 19.79A10 10 0 0 0 18.89 9"></path><path d="M17.91 15.94A7.5 7.5 0 0 0 9.12 7"></path></svg>
          Boost Power
        </button>
        <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 18l5-10l5 10"></path><path d="M14 14h2a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-1a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h2"></path><path d="M7 14a1 1 0 0 0-1-1h-1a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h2"></path></svg>
          Form Alliance
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-yellow-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
          <span>Turn ends in 2:30</span>
        </div>
        <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all">
          End Turn
        </button>
      </div>
    </div>
  );
} 