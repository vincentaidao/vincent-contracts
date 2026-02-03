import { ethers } from "hardhat";

const SALE = "0x75a3150F5685B69E4BEAA228a22F78087bc0c28c";
const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";
const TOKEN_ID = 22839n;

async function main() {
  const sale = await ethers.getContractAt("VinSale", SALE);
  const vin = await ethers.getContractAt("VIN", VIN);

  console.log("transfersEnabled:", await vin.transfersEnabled());
  console.log("finalized:", await sale.finalized());

  const claimTx = await sale.claim();
  console.log("claim tx:", claimTx.hash);
  await claimTx.wait();

  const posm = await ethers.getContractAt(
    ["function ownerOf(uint256 tokenId) view returns (address)"],
    POSITION_MANAGER
  );
  console.log("position owner:", await posm.ownerOf(TOKEN_ID));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
