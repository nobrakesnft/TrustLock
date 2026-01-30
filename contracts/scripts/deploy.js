const hre = require("hardhat");

async function main() {
  // USDC addresses
  // Base Sepolia (testnet): 0x036CbD53842c5426634e7929541eC2318f3dCF7e
  // Base Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

  const network = hre.network.name;
  let usdcAddress;

  if (network === "baseSepolia") {
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    console.log("Deploying to Base Sepolia (testnet)...");
  } else if (network === "base") {
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("Deploying to Base Mainnet...");
  } else {
    // For local testing, deploy a mock USDC
    console.log("Deploying to local network with mock USDC...");
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // placeholder
  }

  console.log("USDC Address:", usdcAddress);

  const DealPactEscrow = await hre.ethers.getContractFactory("DealPactEscrow");
  const escrow = await DealPactEscrow.deploy(usdcAddress);

  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("DealPactEscrow deployed to:", address);
  console.log("");
  console.log("Save this address! You'll need it for the bot.");
  console.log("");
  console.log("To verify on Basescan:");
  console.log(`npx hardhat verify --network ${network} ${address} ${usdcAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
