import { ethers } from "hardhat";

const DAO_WALLET = "0xe70Fd86Bfde61355C7b2941F275016A0206CdDde";
const HUMAN_WALLET = "0xc5c9C2813035513ac77D2B6104Bfda66Dcf1Bb40";
const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

const DAO_SUPPLY = ethers.parseUnits("335000000", 18);
const HUMAN_SUPPLY = ethers.parseUnits("100000000", 18);
const SALE_SUPPLY = ethers.parseUnits("300000000", 18);
const LP_SUPPLY = ethers.parseUnits("150000000", 18);
const AIRDROP_SUPPLY = ethers.parseUnits("115000000", 18);

const HARD_CAP = ethers.parseEther("8");
const CLAIM_AMOUNT = ethers.parseUnits("5000", 18);

const UNISWAP = {
  poolManager: "0x000000000004444c5dc75cB358380D2e3dE08A90",
  positionManager: "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

async function main() {
  const [deployer, buyer] = await ethers.getSigners();

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (chainId !== 1) throw new Error(`Expected chainId=1 fork, got ${chainId}`);

  const registry = await ethers.getContractAt(
    ["function getAgentWallet(uint256) external view returns (address)"],
    IDENTITY_REGISTRY
  );

  const VIN = await ethers.getContractFactory("VIN");
  const vin = await VIN.deploy(deployer.address);
  await vin.waitForDeployment();

  const Locker = await ethers.getContractFactory("PermanentLocker");
  const locker = await Locker.deploy();
  await locker.waitForDeployment();

  const Seeder = await ethers.getContractFactory("LiquiditySeeder");
  const seeder = await Seeder.deploy(
    deployer.address,
    await vin.getAddress(),
    UNISWAP.poolManager,
    UNISWAP.positionManager,
    UNISWAP.permit2,
    DAO_WALLET,
    await locker.getAddress()
  );
  await seeder.waitForDeployment();

  const Sale = await ethers.getContractFactory("VinSale");
  const sale = await Sale.deploy(
    deployer.address,
    await vin.getAddress(),
    DAO_WALLET,
    await seeder.getAddress(),
    HARD_CAP
  );
  await sale.waitForDeployment();

  const Airdrop = await ethers.getContractFactory("VINAirdrop");
  const airdrop = await Airdrop.deploy(deployer.address, await vin.getAddress(), IDENTITY_REGISTRY);
  await airdrop.waitForDeployment();

  await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
  await (await vin.setAllowlist(await seeder.getAddress(), true)).wait();
  await (await seeder.setSaleContract(await sale.getAddress())).wait();
  await (await vin.setSaleContract(await sale.getAddress())).wait();
  await (await vin.setAirdropContract(await airdrop.getAddress())).wait();

  await (await vin.mint(DAO_WALLET, DAO_SUPPLY)).wait();
  await (await vin.mint(HUMAN_WALLET, HUMAN_SUPPLY)).wait();
  await (await vin.mint(await sale.getAddress(), SALE_SUPPLY + LP_SUPPLY)).wait();
  await (await vin.mint(await airdrop.getAddress(), AIRDROP_SUPPLY)).wait();

  await (await buyer.sendTransaction({ to: await sale.getAddress(), value: HARD_CAP })).wait();
  const daoEthBefore = await ethers.provider.getBalance(DAO_WALLET);
  await (await sale.finalize()).wait();
  const daoEthAfter = await ethers.provider.getBalance(DAO_WALLET);

  const daoEthDelta = daoEthAfter - daoEthBefore;
  const saleEth = await ethers.provider.getBalance(await sale.getAddress());
  const seederEth = await ethers.provider.getBalance(await seeder.getAddress());
  const saleVin = await vin.balanceOf(await sale.getAddress());

  if (daoEthDelta < ethers.parseEther("4")) throw new Error("DAO got less than 4 ETH");
  if (saleEth !== 0n) throw new Error(`sale ETH leftover ${saleEth}`);
  if (seederEth !== 0n) throw new Error(`seeder ETH leftover ${seederEth}`);
  if (saleVin !== 0n) throw new Error(`sale VIN leftover ${saleVin}`);

  // Enable and claim for two eligible agents
  await (await airdrop.setClaimEnabled(true)).wait();

  const claimed: Array<{ id: number; wallet: string; before: bigint; after: bigint }> = [];
  for (let id = 0; id < 23000 && claimed.length < 2; id++) {
    const wallet = (await registry.getAgentWallet(id)) as string;
    if (wallet === ethers.ZeroAddress) continue;

    const before = await vin.balanceOf(wallet);
    try {
      await (await airdrop.claim(id)).wait();
      const after = await vin.balanceOf(wallet);
      claimed.push({ id, wallet, before, after });
    } catch {
      // skip ids that still fail for any reason
    }
  }

  if (claimed.length < 2) throw new Error("Could not complete 2 successful claims");
  for (const c of claimed) {
    if (c.after - c.before !== CLAIM_AMOUNT) {
      throw new Error(`Agent ${c.id} claim amount mismatch`);
    }
  }

  // Burn unclaimed after claim window ends
  await (await airdrop.setClaimEndBlock((await ethers.provider.getBlockNumber()) + 5)).wait();
  await ethers.provider.send("hardhat_mine", ["0x6"]);

  const totalSupplyBeforeBurn = await vin.totalSupply();
  const airdropBalBeforeBurn = await vin.balanceOf(await airdrop.getAddress());
  await (await airdrop.burnUnclaimed()).wait();
  const totalSupplyAfterBurn = await vin.totalSupply();
  const airdropBalAfterBurn = await vin.balanceOf(await airdrop.getAddress());

  if (airdropBalAfterBurn !== 0n) throw new Error("Airdrop balance not fully burned");
  if (totalSupplyBeforeBurn - totalSupplyAfterBurn !== airdropBalBeforeBurn) {
    throw new Error("Burn accounting mismatch");
  }

  console.log("✅ Fork targeted checks passed");
  console.log("daoEthDelta:", ethers.formatEther(daoEthDelta));
  console.log("claims:", claimed.map((c) => `${c.id}:${c.wallet}`).join(", "));
  console.log("burnedUnclaimedVIN:", ethers.formatUnits(airdropBalBeforeBurn, 18));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
