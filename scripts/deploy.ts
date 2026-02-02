import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const VIN = await ethers.getContractFactory("VIN");
  const vin = await VIN.deploy(deployer.address);
  await vin.waitForDeployment();

  console.log("VIN deployed:", await vin.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
