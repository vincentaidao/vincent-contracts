import { ethers } from "hardhat";

const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const DAO_WALLET = "0x61b9448B624Ae486be74FD1cCb668F0B52f6f51d";
const HARD_CAP = ethers.parseEther("25");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const now = Math.floor(Date.now() / 1000);
  const startTime = now;
  const endTime = startTime + 7 * 24 * 60 * 60;

  const Sale = await ethers.getContractFactory("VinSale");
  const sale = await Sale.deploy(deployer.address, VIN, DAO_WALLET, startTime, endTime, HARD_CAP);
  await sale.waitForDeployment();

  console.log("Sale deployed:", await sale.getAddress());
  console.log("Sale deploy tx:", sale.deploymentTransaction()?.hash);
  console.log("Sale window:", startTime, "->", endTime);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
