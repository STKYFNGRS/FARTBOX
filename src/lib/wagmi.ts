import { cookieStorage, createStorage } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, base } from '@reown/appkit/networks'; // Added base network

// TODO: Get projectId from https://cloud.reown.com and set it in your .env file
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  // In a real app, you'd throw an error or handle this case appropriately.
  // For now, we'll log a warning and proceed with a placeholder for local development.
  console.warn('Project ID is not defined in environment variables. Using placeholder for Reown AppKit.');
}

// Ensure projectId has a fallback for environments where .env might not be loaded (e.g., some build steps)
const effectiveProjectId = projectId || 'YOUR_PROJECT_ID_PLACEHOLDER';

export const networks = [mainnet, base]; // Using mainnet and base

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: effectiveProjectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig; 