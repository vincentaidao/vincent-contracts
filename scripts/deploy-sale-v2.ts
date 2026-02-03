import { ethers } from "hardhat";
import { writeDeployment } from "./lib/deployments";

const NETWORK = "sepolia";

const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const DAO_WALLET = "0xe70Fd86Bfde61355C7b2941F275016A0206CdDde";
const HARD_CAP = ethers.parseEther("0.001");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const Sale = await ethers.getContractFactory("VinSale");
  const sale = await Sale.deploy(deployer.address, VIN, DAO_WALLET, HARD_CAP);
  await sale.waitForDeployment();

  const saleAddress = await sale.getAddress();
  const saleTx = sale.deploymentTransaction()?.hash;

  console.log("Sale deployed:", saleAddress);
  console.log("Sale deploy tx:", saleTx);
  console.log("Sale cap (wei):", HARD_CAP.toString());

  const outPath = writeDeployment(NETWORK, {
    chainId: 11155111,
    vin: { address: VIN },
    sale: { address: saleAddress, tx: saleTx, capWei: HARD_CAP.toString() },
    daoWallet: DAO_WALLET,
  });
  console.log("Wrote deployment record:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
