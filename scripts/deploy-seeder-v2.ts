import { ethers } from "hardhat";
import { writeDeployment } from "./lib/deployments";

const NETWORK = "sepolia";

const VIN = "0xD0372b3d77A17A0aDB9A39A255A996639Dc9a3Ca";
const DAO_WALLET = "0xe70Fd86Bfde61355C7b2941F275016A0206CdDde";
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

  const seederAddress = await seeder.getAddress();
  const seederTx = seeder.deploymentTransaction()?.hash;

  console.log("Seeder deployed:", seederAddress);
  console.log("Seeder deploy tx:", seederTx);

  const outPath = writeDeployment(NETWORK, {
    chainId: 11155111,
    vin: { address: VIN },
    seeder: { address: seederAddress, tx: seederTx },
    permanentLocker: { address: LOCKER },
    daoWallet: DAO_WALLET,
    uniswapV4: {
      poolManager: POOL_MANAGER,
      positionManager: POSITION_MANAGER,
      permit2: PERMIT2,
    },
  });
  console.log("Wrote deployment record:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
