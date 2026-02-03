import { ethers } from "hardhat";

const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const NEW_SALE = "0x75a3150F5685B69E4BEAA228a22F78087bc0c28c";
const NEW_SEEDER = "0x9f00198158aaAbAB10ab0af591A4e79d1DD24701";
const NEW_LOCKER = "0x807B92d93dab4143c7d7c5Fa0d0401Da3bDee373";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const vin = await ethers.getContractAt("VIN", VIN);

  const tx1 = await vin.setAllowlist(NEW_SALE, true);
  console.log("allowlist sale tx:", tx1.hash);
  await tx1.wait();

  const tx2 = await vin.setAllowlist(NEW_SEEDER, true);
  console.log("allowlist seeder tx:", tx2.hash);
  await tx2.wait();

  const tx3 = await vin.setAllowlist(NEW_LOCKER, true);
  console.log("allowlist locker tx:", tx3.hash);
  await tx3.wait();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
