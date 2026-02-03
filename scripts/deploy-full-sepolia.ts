import { ethers } from "hardhat";

const DAO_WALLET = "0xe70Fd86Bfde61355C7b2941F275016A0206CdDde";
const HUMAN_WALLET = "0xc5c9C2813035513ac77D2B6104Bfda66Dcf1Bb40";

const TOTAL_SUPPLY = ethers.parseUnits("1000000000", 18);
const DAO_SUPPLY = ethers.parseUnits("300000000", 18);
const HUMAN_SUPPLY = ethers.parseUnits("100000000", 18);
const SALE_SUPPLY = ethers.parseUnits("150000000", 18);
const AIRDROP_SUPPLY = ethers.parseUnits("450000000", 18);

const HARD_CAP = ethers.parseEther("0.001");

const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const VIN = await ethers.getContractFactory("VIN");
  const vin = await VIN.deploy(deployer.address);
  await vin.waitForDeployment();
  const vinAddress = await vin.getAddress();
  console.log("VIN deployed:", vinAddress);
  console.log("VIN deploy tx:", vin.deploymentTransaction()?.hash);

  const Sale = await ethers.getContractFactory("VinSale");
  const sale = await Sale.deploy(deployer.address, vinAddress, DAO_WALLET, HARD_CAP);
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  console.log("Sale deployed:", saleAddress);
  console.log("Sale deploy tx:", sale.deploymentTransaction()?.hash);

  const Locker = await ethers.getContractFactory("PermanentLocker");
  const locker = await Locker.deploy();
  await locker.waitForDeployment();
  const lockerAddress = await locker.getAddress();
  console.log("Locker deployed:", lockerAddress);
  console.log("Locker deploy tx:", locker.deploymentTransaction()?.hash);

  const Seeder = await ethers.getContractFactory("LiquiditySeeder");
  const seeder = await Seeder.deploy(
    deployer.address,
    vinAddress,
    POOL_MANAGER,
    POSITION_MANAGER,
    PERMIT2,
    DAO_WALLET,
    lockerAddress
  );
  await seeder.waitForDeployment();
  const seederAddress = await seeder.getAddress();
  console.log("Seeder deployed:", seederAddress);
  console.log("Seeder deploy tx:", seeder.deploymentTransaction()?.hash);

  // Deploy Airdrop
  const Airdrop = await ethers.getContractFactory("VINAirdrop");
  const airdrop = await Airdrop.deploy(deployer.address, vinAddress, IDENTITY_REGISTRY);
  await airdrop.waitForDeployment();
  const airdropAddress = await airdrop.getAddress();
  console.log("Airdrop deployed:", airdropAddress);
  console.log("Airdrop deploy tx:", airdrop.deploymentTransaction()?.hash);

  // Allowlist system contracts
  await (await vin.setAllowlist(saleAddress, true)).wait();
  await (await vin.setAllowlist(seederAddress, true)).wait();
  await (await vin.setAllowlist(lockerAddress, true)).wait();
  await (await vin.setAllowlist(airdropAddress, true)).wait();
  console.log("Allowlist set for sale/seeder/locker/airdrop");

  // Register sale contract for burn privileges
  await (await vin.setSaleContract(saleAddress, true)).wait();
  console.log("Sale contract registered for burn");

  // Mint allocations
  await (await vin.mint(DAO_WALLET, DAO_SUPPLY)).wait();
  await (await vin.mint(HUMAN_WALLET, HUMAN_SUPPLY)).wait();
  await (await vin.mint(saleAddress, SALE_SUPPLY)).wait();
  await (await vin.mint(airdropAddress, AIRDROP_SUPPLY)).wait();
  console.log("Minted DAO/Human/Sale/Airdrop allocations");

  const minted = DAO_SUPPLY + HUMAN_SUPPLY + SALE_SUPPLY + AIRDROP_SUPPLY;
  console.log("Minted total:", minted.toString(), "of", TOTAL_SUPPLY.toString());

  // Transfer ownerships to sale for finalize flow
  await (await vin.transferOwnership(saleAddress)).wait();
  await (await seeder.transferOwnership(saleAddress)).wait();
  console.log("Transferred VIN + Seeder ownership to Sale");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
