import { ethers } from "hardhat";

const VIN = "0xb3186210A6f958DD1f59aA661B04C99cbEC5d85D";
const REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const Airdrop = await ethers.getContractFactory("VINAirdrop");
  const airdrop = await Airdrop.deploy(deployer.address, VIN, REGISTRY);
  await airdrop.waitForDeployment();

  console.log("Airdrop deployed:", await airdrop.getAddress());
  console.log("Airdrop deploy tx:", airdrop.deploymentTransaction()?.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
