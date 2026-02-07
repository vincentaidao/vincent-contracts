import { expect } from "chai";
import { ethers } from "hardhat";

const ONE = 10n ** 18n;

describe("LiquiditySeeder", function () {
  it("enforces sale wiring and seed preconditions", async function () {
    const [owner, other, dao, locker] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Permit2 = await ethers.getContractFactory("MockPermit2");
    const permit2 = await Permit2.deploy();

    const PositionManager = await ethers.getContractFactory("MockPositionManager");
    const positionManager = await PositionManager.deploy(1);

    const Seeder = await ethers.getContractFactory("LiquiditySeeder");
    const seeder = await Seeder.deploy(
      owner.address,
      await vin.getAddress(),
      owner.address,
      await positionManager.getAddress(),
      await permit2.getAddress(),
      dao.address,
      locker.address
    );
    await seeder.waitForDeployment();

    await expect(seeder.connect(other).setSaleContract(other.address))
      .to.be.revertedWithCustomError(seeder, "OwnableUnauthorizedAccount")
      .withArgs(other.address);

    await expect(seeder.setSaleContract(ethers.ZeroAddress)).to.be.revertedWith("INVALID_SALE");
    await expect(seeder.setSaleContract(owner.address)).to.be.revertedWith("BAD_SALE");

    const MockSale = await ethers.getContractFactory("MockLiquiditySeeder");
    const mockSale = await MockSale.deploy();
    await mockSale.waitForDeployment();

    await (await seeder.setSaleContract(await mockSale.getAddress())).wait();
    await expect(seeder.setSaleContract(await mockSale.getAddress())).to.be.revertedWithCustomError(
      seeder,
      "SaleAlreadySet"
    );

    await expect(seeder.connect(other).seed(1)).to.be.revertedWithCustomError(seeder, "NotSale");

    await (await vin.mint(await seeder.getAddress(), 10n * ONE)).wait();
    await expect(seeder.connect(owner).seed(10n * ONE)).to.be.revertedWithCustomError(seeder, "NotSale");
  });

  it("seeds using all ETH and records approvals", async function () {
    const [owner, dao, locker] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Permit2 = await ethers.getContractFactory("MockPermit2");
    const permit2 = await Permit2.deploy();

    const PositionManager = await ethers.getContractFactory("MockPositionManager");
    const positionManager = await PositionManager.deploy(42);

    const Seeder = await ethers.getContractFactory("LiquiditySeeder");
    const seeder = await Seeder.deploy(
      owner.address,
      await vin.getAddress(),
      owner.address,
      await positionManager.getAddress(),
      await permit2.getAddress(),
      dao.address,
      locker.address
    );
    await seeder.waitForDeployment();

    const SaleCaller = await ethers.getContractFactory("MockSaleCaller");
    const saleCaller = await SaleCaller.deploy();
    await saleCaller.waitForDeployment();
    await (await seeder.setSaleContract(await saleCaller.getAddress())).wait();

    const tokenAmount = 50_000n * ONE;
    const ethAmount = ethers.parseEther("2");

    await (await vin.mint(await seeder.getAddress(), tokenAmount)).wait();
    await owner.sendTransaction({ to: await seeder.getAddress(), value: ethAmount });

    await expect(saleCaller.callSeed(await seeder.getAddress(), tokenAmount)).to.emit(seeder, "Seeded");

    expect(await positionManager.lastValue()).to.equal(ethAmount);
    expect(await permit2.lastToken()).to.equal(await vin.getAddress());
    expect(await permit2.lastSpender()).to.equal(await positionManager.getAddress());
    expect(await permit2.lastAmount()).to.equal(tokenAmount);
    expect(await positionManager.lastDeadline()).to.be.greaterThan(0);
  });

  it("rescues funds to a target", async function () {
    const [owner, recipient, dao, locker] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Permit2 = await ethers.getContractFactory("MockPermit2");
    const permit2 = await Permit2.deploy();

    const PositionManager = await ethers.getContractFactory("MockPositionManager");
    const positionManager = await PositionManager.deploy(1);

    const Seeder = await ethers.getContractFactory("LiquiditySeeder");
    const seeder = await Seeder.deploy(
      owner.address,
      await vin.getAddress(),
      owner.address,
      await positionManager.getAddress(),
      await permit2.getAddress(),
      dao.address,
      locker.address
    );
    await seeder.waitForDeployment();

    await (await vin.setAllowlist(await seeder.getAddress(), true)).wait();
    await (await vin.mint(await seeder.getAddress(), 10n * ONE)).wait();
    await owner.sendTransaction({ to: await seeder.getAddress(), value: ethers.parseEther("1") });

    const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
    await (await seeder.rescue(recipient.address, 5n * ONE, ethers.parseEther("0.25"))).wait();

    const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
    const tokenBalance = await vin.balanceOf(recipient.address);

    expect(tokenBalance).to.equal(5n * ONE);
    expect(recipientBalanceAfter).to.be.greaterThan(recipientBalanceBefore);
  });
});
