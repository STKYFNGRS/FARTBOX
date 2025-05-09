// Define Base network configuration types
export interface Chain {
  id: number;
  name: string;
  network: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: {
      http: string[];
    };
    public: {
      http: string[];
    };
  };
  blockExplorers: {
    default: {
      name: string;
      url: string;
    };
  };
  testnet?: boolean;
}

// Define Base network configurations
export const baseChain: Chain = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.BASE_RPC_URL || 'https://mainnet.base.org'],
    },
    public: {
      http: ['https://mainnet.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://basescan.org',
    },
  },
};

export const baseGoerliChain: Chain = {
  id: 84531,
  name: 'Base Goerli',
  network: 'base-goerli',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.BASE_TESTNET_RPC_URL || 'https://goerli.base.org'],
    },
    public: {
      http: ['https://goerli.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://goerli.basescan.org',
    },
  },
  testnet: true,
};

// Use Base Goerli for development, Base for production
export const activeChain = process.env.NODE_ENV === 'production' 
  ? baseChain 
  : baseGoerliChain;

// Contract addresses
export const CONTRACT_ADDRESSES = {
  PLAYER_NFT: process.env.NEXT_PUBLIC_CONTRACT_PLAYER_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
  TOOT_TOKEN: process.env.NEXT_PUBLIC_CONTRACT_TOOT_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
  GAME_MECHANICS: process.env.NEXT_PUBLIC_CONTRACT_GAME_MECHANICS_ADDRESS || '0x0000000000000000000000000000000000000000',
};

// Game configuration
export const GAME_CONFIG = {
  SEASON: parseInt(process.env.NEXT_PUBLIC_GAME_SEASON || '1'),
  MAX_PLAYERS_PER_MAP: parseInt(process.env.NEXT_PUBLIC_MAX_PLAYERS_PER_MAP || '500'),
}; 