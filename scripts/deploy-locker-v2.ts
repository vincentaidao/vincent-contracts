import { ethers } from "hardhat";
import { writeDeployment } from "./lib/deployments";

const NETWORK = "sepolia";

const DAO_WALLET = "0xe70Fd86Bfde61355C7b2941F275016A0206CdDde";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const Locker = await ethers.getContractFactory("PermanentLocker");
  const locker = await Locker.deploy();
  await locker.waitForDeployment();

  const lockerAddress = await locker.getAddress();
  const lockerTx = locker.deploymentTransaction()?.hash;

  console.log("Locker deployed:", lockerAddress);
  console.log("Locker deploy tx:", lockerTx);

  const outPath = writeDeployment(NETWORK, {
    chainId: 11155111,
    daoWallet: DAO_WALLET,
    permanentLocker: { address: lockerAddress, tx: lockerTx },
  });
  console.log("Wrote deployment record:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
