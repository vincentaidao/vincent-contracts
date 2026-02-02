import { ethers } from "hardhat";

const TOTAL_SUPPLY = ethers.parseUnits("1000000000", 18);
const SALE_SUPPLY = ethers.parseUnits("150000000", 18);
const DAO_SUPPLY = ethers.parseUnits("300000000", 18);
const LP_VIN = ethers.parseUnits("90000000", 18);
const HARD_CAP = ethers.parseEther("25");

const DAO_WALLET = "0x61b9448B624Ae486be74FD1cCb668F0B52f6f51d";
const HUMAN_WALLET = "0xc5c9C2813035513ac77D2B6104Bfda66Dcf1Bb40";

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const now = Math.floor(Date.now() / 1000);
  const startTime = now;
  const endTime = startTime + 7 * 24 * 60 * 60;

  const VIN = await ethers.getContractFactory("VIN");
  const vin = await VIN.deploy(deployer.address);
  await vin.waitForDeployment();
  const vinAddress = await vin.getAddress();
  console.log("VIN deployed:", vinAddress);
  console.log("VIN deploy tx:", vin.deploymentTransaction()?.hash);

  const Sale = await ethers.getContractFactory("VinSale");
  const sale = await Sale.deploy(
    deployer.address,
    vinAddress,
    DAO_WALLET,
    startTime,
    endTime,
    HARD_CAP
  );
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  console.log("Sale deployed:", saleAddress);
  console.log("Sale deploy tx:", sale.deploymentTransaction()?.hash);

  const Locker = await ethers.getContractFactory("LPPositionLocker");
  const unlockTime = startTime + 365 * 24 * 60 * 60; // 1 year lock
  const locker = await Locker.deploy(DAO_WALLET, unlockTime);
  await locker.waitForDeployment();
  const lockerAddress = await locker.getAddress();
  console.log("Locker deployed:", lockerAddress);
  console.log("Locker deploy tx:", locker.deploymentTransaction()?.hash);

  const Seeder = await ethers.getContractFactory("LiquiditySeeder");
  const seeder = await Seeder.deploy(
    deployer.address,
    vinAddress,
    POOL_MANAGER,
    POSITION_MANAGER
  );
  await seeder.waitForDeployment();
  const seederAddress = await seeder.getAddress();
  console.log("Seeder deployed:", seederAddress);
  console.log("Seeder deploy tx:", seeder.deploymentTransaction()?.hash);

  // Allowlist system contracts (sale + seeder + locker).
  await (await vin.setAllowlist(saleAddress, true)).wait();
  await (await vin.setAllowlist(seederAddress, true)).wait();
  await (await vin.setAllowlist(lockerAddress, true)).wait();

  // Mint allocations.
  await (await vin.mint(saleAddress, SALE_SUPPLY)).wait();
  await (await vin.mint(DAO_WALLET, DAO_SUPPLY)).wait();

  const minted = SALE_SUPPLY + DAO_SUPPLY;
  console.log("Minted total:", minted.toString(), "of", TOTAL_SUPPLY.toString());
  console.log("Sale window:", startTime, "->", endTime);
  console.log("LP VIN:", LP_VIN.toString());
  console.log("Human wallet (later):", HUMAN_WALLET);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
