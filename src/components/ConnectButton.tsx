'use client';

import { useAppKit } from '@reown/appkit/react';
import { useAccount, useEnsName, useEnsAvatar } from 'wagmi';
import { useState, useEffect } from 'react';

interface ConnectButtonProps {
  className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  
  // ALL STATE HOOKS
  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState<string>('Connect Wallet');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // ALL WAGMI HOOKS
  // Get ENS name with Ethereum mainnet for proper ENS resolution
  const { data: ensName, isError: ensNameError, isLoading: ensNameLoading } = useEnsName({
    address: address,
    chainId: 1, // Ethereum mainnet for ENS
    query: {
      enabled: !!address && isConnected && mounted,
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    },
  });
  
  // Get ENS avatar with Ethereum mainnet for proper ENS resolution
  const { data: ensAvatar, isError: ensAvatarError } = useEnsAvatar({
    name: ensName || undefined,
    chainId: 1, // Ethereum mainnet for ENS
    query: {
      enabled: !!ensName && !ensNameError && mounted,
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    },
  });

  // ALL EFFECT HOOKS
  // Ensure component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Update display name and avatar when data changes
  useEffect(() => {
    if (!mounted) return;
    
    if (isConnected && address) {
      // If ENS name is still loading, show loading state
      if (ensNameLoading) {
        setDisplayName('Loading...');
      } else if (ensName && !ensNameError) {
        setDisplayName(ensName);
      } else {
        setDisplayName(formatAddress(address));
      }
      
      if (ensAvatar && !ensAvatarError) {
        setAvatarUrl(ensAvatar);
      } else {
        setAvatarUrl(null);
      }
    } else {
      setDisplayName('Connect Wallet');
      setAvatarUrl(null);
    }
  }, [mounted, isConnected, address, ensName, ensNameError, ensNameLoading, ensAvatar, ensAvatarError]);

  // FUNCTION DEFINITIONS
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // NOW SAFE FOR CONDITIONAL RETURNS
  // Show loading state during SSR
  if (!mounted) {
    return (
      <button className={className}>
        Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button 
        onClick={() => open()}
        className={`flex items-center gap-2 ${className}`}
      >
        {avatarUrl && (
          <img 
            src={avatarUrl} 
            alt="ENS Avatar" 
            className="w-6 h-6 rounded-full"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none';
              setAvatarUrl(null);
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