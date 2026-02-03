import { ethers } from "hardhat";

const VIN = "0x7fC4289A80d2cF44861f3DaFBe01125B93B5088D";
const SALE = "0xD8e01065780E96677962F1C96B49A14E1f855B37";
const SEEDER = "0x7A1dd1ddBA7F149DDBd864a048579872184c1f2D";
const LOCKER = "0xc63E2fC9C5aE4Cc7662923bA3537C046eC78002c";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const vin = await ethers.getContractAt("VIN", VIN);

  const tx1 = await vin.setAllowlist(SALE, true);
  console.log("allowlist sale tx:", tx1.hash);
  await tx1.wait();

  const tx2 = await vin.setAllowlist(SEEDER, true);
  console.log("allowlist seeder tx:", tx2.hash);
  await tx2.wait();

  const tx3 = await vin.setAllowlist(LOCKER, true);
  console.log("allowlist locker tx:", tx3.hash);
  await tx3.wait();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
