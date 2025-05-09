// Define IPFS configuration types
interface IPFSConfig {
  gateway: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
}

// Define JSON data type
interface IPFSData {
  [key: string]: unknown;
}

// Extract from environment variables
const config: IPFSConfig = {
  gateway: process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/',
  apiUrl: process.env.IPFS_API_URL || 'https://api.pinata.cloud/pinning/pinFileToIPFS',
  apiKey: process.env.IPFS_API_KEY || '',
  apiSecret: process.env.IPFS_API_SECRET || '',
};

/**
 * Uploads a JSON object to IPFS and returns the CID
 * @param data The JSON data to upload to IPFS
 * @returns Promise with the IPFS CID
 */
export async function uploadJSON(data: IPFSData): Promise<string> {
  try {
    // For simplicity, using Pinata-specific example here
    // You can replace with direct IPFS node connection if preferred
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: config.apiKey,
        pinata_secret_api_key: config.apiSecret,
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: {
          name: `fartbox-${Date.now()}.json`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload to IPFS. Status: ${response.status}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
}

/**
 * Retrieves JSON data from IPFS by CID
 * @param cid The IPFS CID to fetch
 * @returns Promise with the JSON data
 */
export async function fetchFromIPFS<T>(cid: string): Promise<T> {
  try {
    const url = `${config.gateway}${cid}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS. Status: ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw error;
  }
}

/**
 * Creates a full IPFS gateway URL from a CID
 * @param cid The IPFS CID
 * @returns Full IPFS gateway URL
 */
export function getIPFSGatewayURL(cid: string): string {
  return `${config.gateway}${cid}`;
}

// Named exports as an object
export const ipfsClient = {
  uploadJSON,
  fetchFromIPFS,
  getIPFSGatewayURL,
};

// Default export with a name
export default ipfsClient; 