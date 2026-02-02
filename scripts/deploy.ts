import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const VIN = await ethers.getContractFactory("VIN");
  const vin = await VIN.deploy(deployer.address);
  await vin.waitForDeployment();

  const address = await vin.getAddress();
  const deployTx = vin.deploymentTransaction();
  console.log("VIN deployed:", address);
  if (deployTx) {
    console.log("Deploy tx:", deployTx.hash);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
