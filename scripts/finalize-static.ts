import { ethers } from "hardhat";

const SALE = "0x75a3150F5685B69E4BEAA228a22F78087bc0c28c";
const SEEDER = "0x9f00198158aaAbAB10ab0af591A4e79d1DD24701";

async function main() {
  const sale = await ethers.getContractAt("VinSale", SALE);
  try {
    await sale.callStatic.finalize(SEEDER);
    console.log("callStatic finalize ok");
  } catch (err) {
    console.error(err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
