import { ethers } from "hardhat";

const SALE = "0x75a3150F5685B69E4BEAA228a22F78087bc0c28c";
const SEEDER = "0x9f00198158aaAbAB10ab0af591A4e79d1DD24701";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const sale = await ethers.getContractAt("VinSale", SALE);
  const tx = await sale.finalize(SEEDER);
  console.log("finalize tx:", tx.hash);
  const receipt = await tx.wait();

  const seederIface = new ethers.Interface([
    "event Seeded(bytes32 indexed poolId, uint256 indexed tokenId, uint128 liquidity, int24 tickLower, int24 tickUpper)",
  ]);
  for (const log of receipt.logs) {
    try {
      const parsed = seederIface.parseLog(log);
      if (parsed?.name === "Seeded") {
        console.log("poolId:", parsed.args.poolId);
        console.log("tokenId:", parsed.args.tokenId.toString());
      }
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
