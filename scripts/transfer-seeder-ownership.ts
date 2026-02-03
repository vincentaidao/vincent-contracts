import { ethers } from "hardhat";

const SEEDER = "0x9f00198158aaAbAB10ab0af591A4e79d1DD24701";
const NEW_OWNER = "0x75a3150F5685B69E4BEAA228a22F78087bc0c28c"; // sale

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const seeder = await ethers.getContractAt("LiquiditySeeder", SEEDER);
  const tx = await seeder.transferOwnership(NEW_OWNER);
  console.log("transferOwnership tx:", tx.hash);
  await tx.wait();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
