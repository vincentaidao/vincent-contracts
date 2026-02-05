import { expect } from "chai";
import { ethers } from "hardhat";

const VIN_PER_ETH = 5_000_000n;

describe("VinSale", function () {
  it("accepts commits, refunds overflow, and delivers VIN", async function () {
    const [owner, buyer] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const cap = ethers.parseEther("2");
    const Sale = await ethers.getContractFactory("VinSale");
    const sale = await Sale.deploy(owner.address, await vin.getAddress(), owner.address, cap);
    await sale.waitForDeployment();

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();

    const saleSupply = 10_000_000_000n * 10n ** 18n;
    await (await vin.mint(await sale.getAddress(), saleSupply)).wait();

    const buyerBalanceStart = await ethers.provider.getBalance(buyer.address);

    const tx = await buyer.sendTransaction({ to: await sale.getAddress(), value: ethers.parseEther("3") });
    const receipt = await tx.wait();
    const gas = receipt!.gasUsed * receipt!.gasPrice!;

    const buyerBalanceEnd = await ethers.provider.getBalance(buyer.address);
    const accepted = ethers.parseEther("2");

    expect(buyerBalanceStart - buyerBalanceEnd - gas).to.equal(accepted);

    const vinExpected = accepted * VIN_PER_ETH;
    expect(await vin.balanceOf(buyer.address)).to.equal(vinExpected);
    expect(await sale.totalRaised()).to.equal(accepted);
  });

  it("reverts when cap is reached", async function () {
    const [owner, buyer] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const cap = ethers.parseEther("1");
    const Sale = await ethers.getContractFactory("VinSale");
    const sale = await Sale.deploy(owner.address, await vin.getAddress(), owner.address, cap);
    await sale.waitForDeployment();

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();

    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("10000000", 18))).wait();

    await buyer.sendTransaction({ to: await sale.getAddress(), value: cap });

    await expect(
      buyer.sendTransaction({ to: await sale.getAddress(), value: 1n })
    ).to.be.revertedWith("CAP_REACHED");
  });

  it("allows refunds before finalize and burns VIN", async function () {
    const [owner, buyer] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const cap = ethers.parseEther("1");
    const Sale = await ethers.getContractFactory("VinSale");
    const sale = await Sale.deploy(owner.address, await vin.getAddress(), owner.address, cap);
    await sale.waitForDeployment();

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();

    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("10000000", 18))).wait();

    await buyer.sendTransaction({ to: await sale.getAddress(), value: ethers.parseEther("1") });

    const vinBefore = await vin.balanceOf(buyer.address);
    await (await sale.connect(buyer).refund(ethers.parseEther("0.4"))).wait();
    const vinAfter = await vin.balanceOf(buyer.address);

    expect(vinBefore - vinAfter).to.equal(ethers.parseEther("0.4") * VIN_PER_ETH);
    expect(await sale.totalRaised()).to.equal(ethers.parseEther("0.6"));
  });

  it("only owner can finalize", async function () {
    const [owner, buyer] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const cap = ethers.parseEther("1");
    const Sale = await ethers.getContractFactory("VinSale");
    const sale = await Sale.deploy(owner.address, await vin.getAddress(), owner.address, cap);
    await sale.waitForDeployment();

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();
    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("10000000", 18))).wait();
    await (await vin.transferOwnership(await sale.getAddress())).wait();

    const Seeder = await ethers.getContractFactory("MockLiquiditySeeder");
    const seeder = await Seeder.deploy();
    await seeder.waitForDeployment();

    await buyer.sendTransaction({ to: await sale.getAddress(), value: cap });

    await expect(sale.connect(buyer).finalize(await seeder.getAddress()))
      .to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount")
      .withArgs(buyer.address);
  });

  it("finalizes only when cap is met, seeds LP, and enables transfers", async function () {
    const [owner, buyer] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const cap = ethers.parseEther("1");
    const Sale = await ethers.getContractFactory("VinSale");
    const sale = await Sale.deploy(owner.address, await vin.getAddress(), owner.address, cap);
    await sale.waitForDeployment();

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();

    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("10000000", 18))).wait();
    await (await vin.transferOwnership(await sale.getAddress())).wait();

    const Seeder = await ethers.getContractFactory("MockLiquiditySeeder");
    const seeder = await Seeder.deploy();
    await seeder.waitForDeployment();

    await buyer.sendTransaction({ to: await sale.getAddress(), value: cap });

    await expect(sale.finalize(await seeder.getAddress())).to.emit(sale, "Finalized");

    expect(await vin.transfersEnabled()).to.equal(true);
    expect(await seeder.totalSeedCalls()).to.equal(1n);
    expect(await seeder.lastSeedAmount()).to.equal(cap * VIN_PER_ETH);
  });

  it("blocks commits and refunds after finalize and blocks early finalize", async function () {
    const [owner, buyer] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const cap = ethers.parseEther("1");
    const Sale = await ethers.getContractFactory("VinSale");
    const sale = await Sale.deploy(owner.address, await vin.getAddress(), owner.address, cap);
    await sale.waitForDeployment();

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();
    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("10000000", 18))).wait();
    await (await vin.transferOwnership(await sale.getAddress())).wait();

    const Seeder = await ethers.getContractFactory("MockLiquiditySeeder");
    const seeder = await Seeder.deploy();
    await seeder.waitForDeployment();

    await expect(sale.finalize(await seeder.getAddress())).to.be.revertedWith("CAP_NOT_MET");

    await buyer.sendTransaction({ to: await sale.getAddress(), value: cap });
    await sale.finalize(await seeder.getAddress());

    await expect(buyer.sendTransaction({ to: await sale.getAddress(), value: 1n })).to.be.revertedWith(
      "FINALIZED"
    );
    await expect(sale.connect(buyer).refund(ethers.parseEther("0.1"))).to.be.revertedWith("FINALIZED");
  });
});
