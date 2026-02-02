import { ethers } from "hardhat";

const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const SALE = "0xBeaC44C99eCC13736cb9b5eC3F6a073079fc1E7f";
const SALE_SUPPLY = ethers.parseUnits("150000000", 18);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const vin = await ethers.getContractAt("VIN", VIN);
  const tx = await vin.mint(SALE, SALE_SUPPLY);
  console.log("mint tx:", tx.hash);
  await tx.wait();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
