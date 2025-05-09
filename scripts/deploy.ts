import { ethers, network } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("Deploying contracts to", network.name);

  // Get the contract factory
  const PlayerNFT = await ethers.getContractFactory("PlayerNFT");

  // Deploy PlayerNFT contract
  console.log("Deploying PlayerNFT...");
  const playerNFT = await PlayerNFT.deploy(
    "Fartbox Player", // name
    "FBP", // symbol
    "ipfs://", // baseURI - placeholder to be updated after deployment
    0, // maxSupply - 0 means unlimited
    ethers.parseEther("0.01"), // mintPrice - 0.01 ETH
    500 // maxPlayersPerMap
  );

  await playerNFT.waitForDeployment();
  
  const playerNFTAddress = await playerNFT.getAddress();
  console.log("PlayerNFT deployed to:", playerNFTAddress);

  // Save deployment info to a file
  const deploymentInfo = {
    network: network.name,
    playerNFT: playerNFTAddress,
    // Other contracts will be added here
  };

  // Write deployment info to a file
  const deploymentPath = join(__dirname, "..", "src/deployments");
  try {
    writeFileSync(
      `${deploymentPath}/${network.name}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`Deployment info saved to ${deploymentPath}/${network.name}.json`);
  } catch (error) {
    console.error("Error saving deployment info:", error);
  }

  console.log("Deployment complete!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 