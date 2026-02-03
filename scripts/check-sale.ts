import { ethers } from "hardhat";

const SALE = "0x75a3150F5685B69E4BEAA228a22F78087bc0c28c";

async function main() {
  const sale = await ethers.getContractAt("VinSale", SALE);
  console.log("totalRaised", (await sale.totalRaised()).toString());
  console.log("cap", (await sale.totalCapWei()).toString());
  console.log("finalized", await sale.finalized());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
