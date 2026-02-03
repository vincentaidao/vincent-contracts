import { ethers } from "hardhat";

const SALE = "0x75a3150F5685B69E4BEAA228a22F78087bc0c28c";
const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const SEEDER = "0x9f00198158aaAbAB10ab0af591A4e79d1DD24701";
const LOCKER = "0x807B92d93dab4143c7d7c5Fa0d0401Da3bDee373";
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const sale = await ethers.getContractAt("VinSale", SALE);
  const vin = await ethers.getContractAt("VIN", VIN);

  const totalRaised: bigint = await sale.totalRaised();
  const cap: bigint = await sale.totalCapWei();
  const remaining = cap > totalRaised ? cap - totalRaised : 0n;

  let commitTxHash: string | null = null;
  if (remaining > 0n) {
    const commitTx = await sale.commit({ value: remaining });
    commitTxHash = commitTx.hash;
    await commitTx.wait();
    console.log("commit tx:", commitTxHash);
  } else {
    console.log("cap already met");
  }

  const finalizeTx = await sale.finalize(SEEDER);
  const finalizeReceipt = await finalizeTx.wait();
  console.log("finalize tx:", finalizeTx.hash);

  const transfersEnabled: boolean = await vin.transfersEnabled();
  console.log("transfersEnabled:", transfersEnabled);

  const claimTx = await sale.claim();
  await claimTx.wait();
  console.log("claim tx:", claimTx.hash);

  // Extract Seeded event data from receipt logs.
  const seederIface = new ethers.Interface([
    "event Seeded(bytes32 indexed poolId, uint256 indexed tokenId, uint128 liquidity, int24 tickLower, int24 tickUpper)",
  ]);
  let poolId: string | null = null;
  let tokenId: string | null = null;
  for (const log of finalizeReceipt?.logs || []) {
    try {
      const parsed = seederIface.parseLog(log);
      if (parsed?.name === "Seeded") {
        poolId = parsed.args.poolId;
        tokenId = parsed.args.tokenId.toString();
      }
    } catch {
      // ignore
    }
  }

  console.log("poolId:", poolId);
  console.log("position tokenId:", tokenId);

  let positionOwner: string | null = null;
  if (tokenId) {
    const posm = await ethers.getContractAt(
      ["function ownerOf(uint256 tokenId) view returns (address)"],
      POSITION_MANAGER
    );
    positionOwner = await posm.ownerOf(tokenId);
    console.log("position owner:", positionOwner);
  }

  return {
    commitTxHash,
    finalizeTxHash: finalizeTx.hash,
    claimTxHash: claimTx.hash,
    transfersEnabled,
    poolId,
    tokenId,
    positionOwner,
  };
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
