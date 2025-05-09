interface GameHeaderProps {
  isWalletConnected: boolean;
}

export default function GameHeader({ isWalletConnected }: GameHeaderProps) {
  return (
    <header className="relative z-10 flex justify-between items-center p-4 gas-container border-b border-green-500/30">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-extrabold gas-text">
          FART.BOX
        </h1>
        <span className="text-sm px-2 py-1 rounded bg-green-500/20 text-green-400 font-semibold">
          GAS DOMINANCE
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-sm px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full font-medium">
          SEASON 1 • ACTIVE
        </div>
        {!isWalletConnected ? (
          <appkit-button />
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Connected</span>
          </div>
        )}
      </div>
    </header>
  );
} 