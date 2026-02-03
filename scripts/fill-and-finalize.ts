import { ethers } from "hardhat";

const SALE = "0x58FD33D769EF50aa4898E993eC10dd61a51e701a";
const VIN = "0xCb1bd09bD5167EBFc2c6d8c49523434Ca8ba2304";
const SEEDER = "0xfFAb1C3b57Bc1cF597aBCB7abae7f0954508ee6E";
const LOCKER = "0x5F83c968C6988F4ecFe73cD3d597a2f7Fc34d753";
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const sale = await ethers.getContractAt("VinSale", SALE);
  const vin = await ethers.getContractAt("VIN", VIN);

  const totalRaised: bigint = await sale.totalRaised();
  const cap: bigint = await sale.totalCapWei();
  const remaining = cap > totalRaised ? cap - totalRaised : 0n;
  console.log("totalRaised", totalRaised.toString());
  console.log("cap", cap.toString());
  console.log("remaining", remaining.toString());

  let commitTxHash: string | null = null;
  let accepted = 0n;
  let refunded = 0n;
  let vinBalanceBefore = await vin.balanceOf(deployer.address);
  let vinBalanceAfter = vinBalanceBefore;

  if (remaining > 0n) {
    const value = remaining;
    const tx = await sale.commit({ value });
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
    refunded = value - accepted;
    vinBalanceAfter = await vin.balanceOf(deployer.address);
  }

  console.log("commit tx", commitTxHash);
  console.log("accepted", accepted.toString());
  console.log("refunded", refunded.toString());
  console.log("vinBalanceBefore", vinBalanceBefore.toString());
  console.log("vinBalanceAfter", vinBalanceAfter.toString());

  const finalizedBefore = await sale.finalized();
  let finalizeTxHash: string | null = null;
  let poolId: string | null = null;
  let tokenId: string | null = null;

  if (!finalizedBefore && (await sale.totalRaised()) === cap) {
    const tx = await sale.finalize(SEEDER);
    finalizeTxHash = tx.hash;
    const receipt = await tx.wait();

    const seederIface = new ethers.Interface([
      "event Seeded(bytes32 indexed poolId, uint256 indexed tokenId, uint128 liquidity, int24 tickLower, int24 tickUpper)",
    ]);
    for (const log of receipt.logs) {
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
  }

  const transfersEnabled = await vin.transfersEnabled();
  const finalizedAfter = await sale.finalized();

  let positionOwner: string | null = null;
  if (tokenId) {
    const posm = await ethers.getContractAt(
      ["function ownerOf(uint256 tokenId) view returns (address)"],
      POSITION_MANAGER
    );
    positionOwner = await posm.ownerOf(tokenId);
  }

  console.log("finalizeTx", finalizeTxHash);
  console.log("poolId", poolId);
  console.log("tokenId", tokenId);
  console.log("positionOwner", positionOwner);
  console.log("transfersEnabled", transfersEnabled);
  console.log("finalized", finalizedAfter);
  console.log("locker", LOCKER);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
