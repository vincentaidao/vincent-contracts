import { ethers } from "hardhat";
import { writeDeployment } from "./lib/deployments";

const NETWORK = "sepolia";

const VIN = "0xb3186210A6f958DD1f59aA661B04C99cbEC5d85D";
const REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const Airdrop = await ethers.getContractFactory("VINAirdrop");
  const airdrop = await Airdrop.deploy(deployer.address, VIN, REGISTRY);
  await airdrop.waitForDeployment();

  const airdropAddress = await airdrop.getAddress();
  const airdropTx = airdrop.deploymentTransaction()?.hash;

  console.log("Airdrop deployed:", airdropAddress);
  console.log("Airdrop deploy tx:", airdropTx);

  const outPath = writeDeployment(NETWORK, {
    chainId: 11155111,
    vin: { address: VIN },
    airdrop: { address: airdropAddress, tx: airdropTx, identityRegistry: REGISTRY },
  });
  console.log("Wrote deployment record:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
