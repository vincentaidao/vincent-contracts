import { ethers } from "hardhat";

const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const DAO_WALLET = "0xe70Fd86Bfde61355C7b2941F275016A0206CdDde";
const HARD_CAP = ethers.parseEther("0.001");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const Sale = await ethers.getContractFactory("VinSale");
  const sale = await Sale.deploy(deployer.address, VIN, DAO_WALLET, HARD_CAP);
  await sale.waitForDeployment();

  console.log("Sale deployed:", await sale.getAddress());
  console.log("Sale deploy tx:", sale.deploymentTransaction()?.hash);
  console.log("Sale cap (wei):", HARD_CAP.toString());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
