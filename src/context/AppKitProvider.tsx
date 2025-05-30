'use client';

import { wagmiAdapter, projectId as envProjectId } from '../lib/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import React, { type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';
import { mainnet, base } from '@reown/appkit/networks';
import { TransactionProvider } from 'ethereum-identity-kit';
import 'ethereum-identity-kit/css';

// Set up queryClient
const queryClient = new QueryClient();

const projectId = envProjectId || 'YOUR_PROJECT_ID_PLACEHOLDER';

if (!projectId || projectId === 'YOUR_PROJECT_ID_PLACEHOLDER') {
  console.warn(
    'Reown AppKit: Project ID is not defined or using placeholder. Please set NEXT_PUBLIC_REOWN_PROJECT_ID in your .env file.'
  );
}

const metadata = {
  name: 'Fart.box: Gas Dominance',
  description: 'A web3 game of territory control with unique gas-based NFTs on Base network',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  icons: [
    '/favicon.ico',
    '/favicon-16x16.png',
    '/favicon-32x32.png', 
    '/apple-touch-icon.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png'
  ],
};

// Create the modal and export it
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet, base],
  defaultNetwork: base,
  metadata: metadata,
  features: {
    analytics: true,
    connectMethodsOrder: ['wallet', 'email', 'social'],
    email: true,
    socials: ['google', 'x', 'github', 'discord', 'apple'],
    emailShowWallets: true,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-font-family': 'Inter, system-ui, sans-serif',
    '--w3m-accent': 'rgb(34, 197, 94)', // green-500
    '--w3m-color-mix': 'rgb(34, 197, 94)',
    '--w3m-color-mix-strength': 20,
    '--w3m-border-radius-master': '8px',
  },
  enableEIP6963: true,
  enableCoinbase: true,
  enableWalletConnect: true,
});

function AppKitProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  // Wrap children with TransactionProvider from ethereum-identity-kit
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <TransactionProvider>
          {children}
        </TransactionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default AppKitProvider; 