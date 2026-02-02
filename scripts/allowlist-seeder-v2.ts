import { ethers } from "hardhat";

const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const NEW_SEEDER = "0x89ca1A0E7F7E67e7BC0d9ce5FC87B6C5094F1850";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const vin = await ethers.getContractAt("VIN", VIN);
  const tx = await vin.setAllowlist(NEW_SEEDER, true);
  console.log("setAllowlist tx:", tx.hash);
  await tx.wait();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
