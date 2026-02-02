import { ethers } from "hardhat";

async function main() {
  const vin = await ethers.getContractAt(
    "VIN",
    "0x7A74878D4b9089A7D0205e75D302839AfAB79346"
  );
  console.log("name", await vin.name());
  console.log("symbol", await vin.symbol());
  console.log("decimals", await vin.decimals());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
