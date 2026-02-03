import { ethers } from "hardhat";

const SALE = "0x75a3150F5685B69E4BEAA228a22F78087bc0c28c";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const sale = await ethers.getContractAt("VinSale", SALE);
  const value = ethers.parseEther("0.005");

  try {
    const tx = await sale.commit({ value });
    console.log("commit tx:", tx.hash);
    await tx.wait();
  } catch (err) {
    console.error("commit failed:");
    console.error(err);
  }

  console.log("totalRaised:", (await sale.totalRaised()).toString());
  console.log("finalized:", await sale.finalized());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
