'use client';

import { useAppKit } from '@reown/appkit/react';
import { useAccount, useEnsName, useEnsAvatar } from 'wagmi';
import { normalize } from 'viem/ens';

interface ConnectButtonProps {
  className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  
  // Get ENS name and avatar with proper error handling
  const { data: ensName, isError: ensNameError } = useEnsName({
    address: address,
    chainId: 1, // Mainnet for ENS
    query: {
      enabled: !!address && isConnected,
    },
  });
  
  const { data: ensAvatar, isError: ensAvatarError } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: 1,
    query: {
      enabled: !!ensName && !ensNameError,
    },
  });

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Use ENS name if available and no error, otherwise use formatted address
  const displayName = ensName && !ensNameError 
    ? ensName 
    : (address ? formatAddress(address) : 'Connect Wallet');

  if (isConnected && address) {
    return (
      <button 
        onClick={() => open()}
        className={`flex items-center gap-2 ${className}`}
      >
        {ensAvatar && !ensAvatarError && (
          <img 
            src={ensAvatar} 
            alt="ENS Avatar" 
            className="w-6 h-6 rounded-full"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <span className="font-medium">
          {displayName}
        </span>
      </button>
    );
  }

  return (
    <button 
      onClick={() => open()}
      className={className}
    >
      Connect Wallet
    </button>
  );
} 