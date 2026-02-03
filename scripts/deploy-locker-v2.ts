import { ethers } from "hardhat";

const DAO_WALLET = "0xe70Fd86Bfde61355C7b2941F275016A0206CdDde";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const Locker = await ethers.getContractFactory("LPPositionLocker");
  const unlockTime = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  const locker = await Locker.deploy(DAO_WALLET, unlockTime);
  await locker.waitForDeployment();

  console.log("Locker deployed:", await locker.getAddress());
  console.log("Locker deploy tx:", locker.deploymentTransaction()?.hash);
  console.log("Unlock time:", unlockTime);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
