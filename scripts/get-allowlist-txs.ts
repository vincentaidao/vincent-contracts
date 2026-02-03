import { ethers } from "hardhat";

const VIN = "0x7fC4289A80d2cF44861f3DaFBe01125B93B5088D";
const VIN_DEPLOY_TX = "0xfb2fd204faebf0ef08cf1ebc44974907db64a81c1c23f1bdb70f887188a12ae2";

async function main() {
  const provider = ethers.provider;
  const deployReceipt = await provider.getTransactionReceipt(VIN_DEPLOY_TX);
  const fromBlock = deployReceipt?.blockNumber ?? 0;

  const vin = await ethers.getContractAt("VIN", VIN);
  const filter = vin.filters.AllowlistUpdated();
  const logs = await vin.queryFilter(filter, fromBlock);

  for (const log of logs) {
    console.log("allowlist tx:", log.transactionHash, "account:", log.args?.account, "allowed:", log.args?.allowed);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
