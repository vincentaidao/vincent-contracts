import { ethers, network } from "hardhat";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { NETWORK_DEFAULTS, UNISWAP_V4_BY_CHAIN_ID } from "./lib/deploy-config";

const DAO_WALLET = "0xe70Fd86Bfde61355C7b2941F275016A0206CdDde";
const HUMAN_WALLET = "0xc5c9C2813035513ac77D2B6104Bfda66Dcf1Bb40";

const DAO_SUPPLY = ethers.parseUnits("300000000", 18);
const HUMAN_SUPPLY = ethers.parseUnits("100000000", 18);
const SALE_SUPPLY = ethers.parseUnits("200000000", 18);
const LP_SUPPLY = ethers.parseUnits("100000000", 18);
const AIRDROP_SUPPLY = ethers.parseUnits("300000000", 18);

const HARD_CAP = ethers.parseEther("40");

const CLAIM_ENABLE_POLICY =
  "Enable claims manually 1 week after sellout AND after LP is seeded.";

type CliArgs = {
  network?: string;
  stage?: string;
  confirmMainnet?: boolean;
  force?: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--network" || current === "-n") {
      args.network = argv[i + 1];
      i += 1;
      continue;
    }
    if (current.startsWith("--network=")) {
      args.network = current.split("=")[1];
      continue;
    }
    if (current === "--stage" || current === "-s") {
      args.stage = argv[i + 1];
      i += 1;
      continue;
    }
    if (current.startsWith("--stage=")) {
      args.stage = current.split("=")[1];
      continue;
    }
    if (current === "--confirm-mainnet") {
      args.confirmMainnet = true;
      continue;
    }
    if (current === "--force") {
      args.force = true;
      continue;
    }
  }
  return args;
}

function requireEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing ${name} env var`);
  }
  return value;
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const networkName = cli.network ?? process.env.DEPLOY_NETWORK ?? network.name;
  const stage = cli.stage ?? process.env.DEPLOY_STAGE;
  const defaults = NETWORK_DEFAULTS[networkName];
  if (!defaults) {
    throw new Error(`Unsupported network: ${networkName}`);
  }

  const actualChainId = Number((await ethers.provider.getNetwork()).chainId);
  if (actualChainId !== defaults.chainId) {
    throw new Error(`ChainId mismatch: expected ${defaults.chainId}, got ${actualChainId}`);
  }

  if (networkName === "mainnet") {
    const confirmed =
      cli.confirmMainnet || process.env.CONFIRM_MAINNET === "YES" || process.env.CONFIRM_MAINNET === "true";
    if (!confirmed) {
      throw new Error("Mainnet deploy requires --confirm-mainnet or CONFIRM_MAINNET=YES");
    }
  }

  const outDir = join(__dirname, "..", "deployments");
  mkdirSync(outDir, { recursive: true });
  const stageSuffix = stage ? `-${stage}` : "";
  const outPath = join(outDir, `${networkName}${stageSuffix}.json`);
  if (existsSync(outPath) && !cli.force) {
    console.log(`Deployment record exists at ${outPath}. Use --force to redeploy.`);
    return;
  }

  const identityRegistry = process.env.IDENTITY_REGISTRY ?? defaults.identityRegistry;
  const uniswapDefaults = UNISWAP_V4_BY_CHAIN_ID[defaults.chainId];

  const poolManager = requireEnv(
    "UNISWAP_V4_POOL_MANAGER",
    process.env.UNISWAP_V4_POOL_MANAGER ?? uniswapDefaults?.poolManager
  );
  const positionManager = requireEnv(
    "UNISWAP_V4_POSITION_MANAGER",
    process.env.UNISWAP_V4_POSITION_MANAGER ?? uniswapDefaults?.positionManager
  );
  const permit2 = requireEnv(
    "UNISWAP_V4_PERMIT2",
    process.env.UNISWAP_V4_PERMIT2 ?? uniswapDefaults?.permit2
  );

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
    poolManager,
    positionManager,
    permit2,
    DAO_WALLET,
    lockerAddress
  );
  await seeder.waitForDeployment();
  const seederAddress = await seeder.getAddress();
  console.log("Seeder deployed:", seederAddress);
  console.log("Seeder deploy tx:", seeder.deploymentTransaction()?.hash);

  const Airdrop = await ethers.getContractFactory("VINAirdrop");
  const airdrop = await Airdrop.deploy(deployer.address, vinAddress, identityRegistry);
  await airdrop.waitForDeployment();
  const airdropAddress = await airdrop.getAddress();
  console.log("Airdrop deployed:", airdropAddress);
  console.log("Airdrop deploy tx:", airdrop.deploymentTransaction()?.hash);

  const provider = ethers.provider;
  const deployBlock = await provider.getBlockNumber();
  const blocksFor3Months = 648_000; // ~90 days @ 12s blocks
  console.log("Deploy block:", deployBlock);
  console.log("Claims left disabled; enable manually with enableClaimsForDuration(blocksFor3Months).");
  console.log(`Airdrop ops policy: ${CLAIM_ENABLE_POLICY}`);

  await (await vin.setAllowlist(saleAddress, true)).wait();
  await (await vin.setAllowlist(seederAddress, true)).wait();
  await (await vin.setAllowlist(lockerAddress, true)).wait();
  await (await vin.setAllowlist(airdropAddress, true)).wait();
  console.log("Allowlist set for sale/seeder/locker/airdrop");

  await (await vin.setSaleContract(saleAddress)).wait();
  await (await vin.setAirdropContract(airdropAddress)).wait();
  console.log("Sale contract registered for burn + airdrop burn set");

  await (await vin.mint(DAO_WALLET, DAO_SUPPLY)).wait();
  await (await vin.mint(HUMAN_WALLET, HUMAN_SUPPLY)).wait();
  await (await vin.mint(saleAddress, SALE_SUPPLY + LP_SUPPLY)).wait();
  await (await vin.mint(airdropAddress, AIRDROP_SUPPLY)).wait();
  console.log("Minted DAO/Human/Sale+LP/Airdrop allocations");

  const minted = DAO_SUPPLY + HUMAN_SUPPLY + SALE_SUPPLY + LP_SUPPLY + AIRDROP_SUPPLY;
  console.log("Minted total:", minted.toString());

  await (await vin.transferOwnership(saleAddress)).wait();
  await (await seeder.transferOwnership(saleAddress)).wait();
  console.log("Transferred VIN + Seeder ownership to Sale");

  const record = {
    network: networkName,
    stage: stage ?? null,
    chainId: defaults.chainId,
    deployedAt: new Date().toISOString(),
    daoWallet: DAO_WALLET,
    humanWallet: HUMAN_WALLET,
    identityRegistry,
    vin: {
      address: vinAddress,
      tx: vin.deploymentTransaction()?.hash,
    },
    sale: {
      address: saleAddress,
      tx: sale.deploymentTransaction()?.hash,
      capEth: "40",
      capWei: HARD_CAP.toString(),
      finalizePolicy: "Only when cap is met. No time-based end and no early finalize.",
    },
    permanentLocker: {
      address: lockerAddress,
      tx: locker.deploymentTransaction()?.hash,
    },
    seeder: {
      address: seederAddress,
      tx: seeder.deploymentTransaction()?.hash,
    },
    airdrop: {
      address: airdropAddress,
      tx: airdrop.deploymentTransaction()?.hash,
      claimAmountVin: "12000",
      eligibleAgentIds: "0..24999",
      totalVin: "300000000",
      claimDurationBlocks: blocksFor3Months.toString(),
      claimEnabled: false,
      claimsPolicy: CLAIM_ENABLE_POLICY,
    },
    uniswapV4: {
      poolManager,
      positionManager,
      permit2,
    },
  };
  writeFileSync(outPath, JSON.stringify(record, null, 2) + "\n");
  console.log("Wrote deployment record:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
