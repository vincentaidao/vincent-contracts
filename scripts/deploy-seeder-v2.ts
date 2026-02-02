import { ethers } from "hardhat";

const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const DAO_WALLET = "0x61b9448B624Ae486be74FD1cCb668F0B52f6f51d";
const LOCKER = "0x225ae5C88A08bbceEe103C1b35aB2e6c58058b01";

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const Seeder = await ethers.getContractFactory("LiquiditySeeder");
  const seeder = await Seeder.deploy(
    deployer.address,
    VIN,
    POOL_MANAGER,
    POSITION_MANAGER,
    PERMIT2,
    DAO_WALLET,
    LOCKER
  );
  await seeder.waitForDeployment();

  console.log("Seeder deployed:", await seeder.getAddress());
  console.log("Seeder deploy tx:", seeder.deploymentTransaction()?.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
