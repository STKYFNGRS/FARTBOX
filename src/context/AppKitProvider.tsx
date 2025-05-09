'use client';

import { wagmiAdapter, projectId as envProjectId, networks } from '../lib/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import React, { type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';
import { mainnet, base } from '@reown/appkit/networks';

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

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet, base] as any, // Type cast to avoid type issues
  defaultNetwork: base,
  metadata: metadata,
  features: {
    analytics: true,
    connectMethodsOrder: ['wallet', 'email', 'social'],
  },
});

function AppKitProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default AppKitProvider; 