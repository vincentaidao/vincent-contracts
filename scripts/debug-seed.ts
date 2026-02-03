import { ethers } from "hardhat";

const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const SEEDER = "0x9f00198158aaAbAB10ab0af591A4e79d1DD24701";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const vin = await ethers.getContractAt("VIN", VIN);
  const seeder = await ethers.getContractAt("LiquiditySeeder", SEEDER);

  const ethAmount = ethers.parseEther("0.001");
  const vinAmount = ethers.parseUnits("6000", 18);

  const tx1 = await vin.transfer(SEEDER, vinAmount);
  console.log("vin transfer tx:", tx1.hash);
  await tx1.wait();

  const tx2 = await deployer.sendTransaction({ to: SEEDER, value: ethAmount });
  console.log("eth transfer tx:", tx2.hash);
  await tx2.wait();

  const tx3 = await seeder.seed(vinAmount);
  console.log("seed tx:", tx3.hash);
  await tx3.wait();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
