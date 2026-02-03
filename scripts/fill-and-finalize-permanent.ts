import { ethers } from "hardhat";

const SALE = "0x20102C4daF3FbE98fF5b761Bff3f7B58726FC8a5";
const VIN = "0xb3186210A6f958DD1f59aA661B04C99cbEC5d85D";
const SEEDER = "0xDdc3d9496B75Cafe39801Bd3e6d0510fBd72a152";
const LOCKER = "0x80d941c2850414a264acFa5823c50794221D72bd";
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
  let accepted = 0n;
  let refunded = 0n;
  const vinBalanceBefore = await vin.balanceOf(deployer.address);
  let vinBalanceAfter = vinBalanceBefore;

  if (remaining > 0n) {
    const tx = await sale.commit({ value: remaining });
    commitTxHash = tx.hash;
    const receipt = await tx.wait();

    const iface = new ethers.Interface([
      "event Commit(address indexed buyer, uint256 ethAccepted, uint256 vinAmount)",
    ]);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "Commit") {
          accepted = BigInt(parsed.args.ethAccepted);
        }
      } catch {
        // ignore
      }
    }
    refunded = remaining - accepted;
    vinBalanceAfter = await vin.balanceOf(deployer.address);
  }

  const finalizeTx = await sale.finalize(SEEDER);
  const finalizeReceipt = await finalizeTx.wait();

  const seederIface = new ethers.Interface([
    "event Seeded(bytes32 indexed poolId, uint256 indexed tokenId, uint128 liquidity, int24 tickLower, int24 tickUpper)",
  ]);
  let poolId: string | null = null;
  let tokenId: string | null = null;
  for (const log of finalizeReceipt.logs) {
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

  const transfersEnabled = await vin.transfersEnabled();
  const finalized = await sale.finalized();

  let positionOwner: string | null = null;
  if (tokenId) {
    const posm = await ethers.getContractAt(
      ["function ownerOf(uint256 tokenId) view returns (address)"],
      POSITION_MANAGER
    );
    positionOwner = await posm.ownerOf(tokenId);
  }

  console.log("commitTx", commitTxHash);
  console.log("accepted", accepted.toString());
  console.log("refunded", refunded.toString());
  console.log("vinBalanceBefore", vinBalanceBefore.toString());
  console.log("vinBalanceAfter", vinBalanceAfter.toString());
  console.log("finalizeTx", finalizeTx.hash);
  console.log("poolId", poolId);
  console.log("tokenId", tokenId);
  console.log("positionOwner", positionOwner);
  console.log("transfersEnabled", transfersEnabled);
  console.log("finalized", finalized);
  console.log("locker", LOCKER);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
