import { cookieStorage, createStorage, http, fallback } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, base } from '@reown/appkit/networks';

// Get projectId from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId) {
  // In a real app, you'd throw an error or handle this case appropriately.
  // For now, we'll log a warning and proceed with a placeholder for local development.
  console.warn('Project ID is not defined in environment variables. Using placeholder for Reown AppKit.');
}

// Ensure projectId has a fallback for environments where .env might not be loaded (e.g., some build steps)
const effectiveProjectId = projectId || 'YOUR_PROJECT_ID_PLACEHOLDER';

export const networks = [mainnet, base]; // Using mainnet and base

//Set up the Wagmi Adapter with reliable ENS resolution
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: effectiveProjectId,
  networks,
  transports: {
    [mainnet.id]: fallback([
      http('https://eth-mainnet.g.alchemy.com/v2/demo'),
      http('https://rpc.ankr.com/eth'),
      http('https://ethereum.publicnode.com'),
      http() // AppKit default
    ]),
    [base.id]: http('https://mainnet.base.org'),
  },
});

export const config = wagmiAdapter.wagmiConfig; 