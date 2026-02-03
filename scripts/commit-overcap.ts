import { ethers } from "hardhat";

const SALE = "0xD8e01065780E96677962F1C96B49A14E1f855B37";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const sale = await ethers.getContractAt("VinSale", SALE);
  const value = ethers.parseEther("0.0006");

  const tx = await sale.commit({ value });
  console.log("commit tx:", tx.hash);
  const receipt = await tx.wait();

  const totalRaised = await sale.totalRaised();
  const cap = await sale.totalCapWei();
  const finalized = await sale.finalized();

  console.log("totalRaised", totalRaised.toString());
  console.log("cap", cap.toString());
  console.log("finalized", finalized);

  // extract Commit event
  const iface = new ethers.Interface([
    "event Commit(address indexed buyer, uint256 ethAccepted, uint256 vinAmount)",
  ]);
  let accepted = 0n;
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

  const refunded = value - accepted;
  console.log("accepted", accepted.toString());
  console.log("refunded", refunded.toString());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
