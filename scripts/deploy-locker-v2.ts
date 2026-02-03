import { ethers } from "hardhat";
import { writeDeployment } from "./lib/deployments";

const NETWORK = "sepolia";

const DAO_WALLET = "0xe70Fd86Bfde61355C7b2941F275016A0206CdDde";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const Locker = await ethers.getContractFactory("LPPositionLocker");
  const unlockTime = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  const locker = await Locker.deploy(DAO_WALLET, unlockTime);
  await locker.waitForDeployment();

  const lockerAddress = await locker.getAddress();
  const lockerTx = locker.deploymentTransaction()?.hash;

  console.log("Locker deployed:", lockerAddress);
  console.log("Locker deploy tx:", lockerTx);
  console.log("Unlock time:", unlockTime);

  const outPath = writeDeployment(NETWORK, {
    chainId: 11155111,
    daoWallet: DAO_WALLET,
    lpPositionLocker: { address: lockerAddress, tx: lockerTx, unlockTime },
  });
  console.log("Wrote deployment record:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
