import { expect } from "chai";
import { ethers } from "hardhat";

const VIN_PER_ETH = 7_500_000n;

describe("VinSale", function () {
  async function deploySaleFixture(capEth: string = "1") {
    const [owner] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Seeder = await ethers.getContractFactory("MockLiquiditySeeder");
    const seeder = await Seeder.deploy();
    await seeder.waitForDeployment();

    const cap = ethers.parseEther(capEth);
    const Sale = await ethers.getContractFactory("VinSale");
    const sale = await Sale.deploy(
      owner.address,
      await vin.getAddress(),
      owner.address,
      await seeder.getAddress(),
      cap
    );
    await sale.waitForDeployment();

    return { owner, vin, seeder, sale, cap };
  }

  it("validates constructor seeder and cap inputs", async function () {
    const [owner] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Sale = await ethers.getContractFactory("VinSale");

    await expect(
      Sale.deploy(owner.address, await vin.getAddress(), owner.address, ethers.ZeroAddress, 1n)
    ).to.be.revertedWith("INVALID_SEEDER");

    await expect(
      Sale.deploy(owner.address, await vin.getAddress(), owner.address, owner.address, 1n)
    ).to.be.revertedWith("BAD_SEEDER");

    const Seeder = await ethers.getContractFactory("MockLiquiditySeeder");
    const seeder = await Seeder.deploy();
    await seeder.waitForDeployment();

    await expect(
      Sale.deploy(owner.address, await vin.getAddress(), owner.address, await seeder.getAddress(), 0n)
    ).to.be.revertedWith("INVALID_CAP");
  });

  it("accepts commits, refunds overflow, and delivers VIN", async function () {
    const [, buyer] = await ethers.getSigners();
    const { vin, sale } = await deploySaleFixture("2");

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();

    const saleSupply = ethers.parseUnits("15000000", 18);
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
    const [, buyer] = await ethers.getSigners();
    const { vin, sale, cap } = await deploySaleFixture("1");

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();

    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("15000000", 18))).wait();

    await buyer.sendTransaction({ to: await sale.getAddress(), value: cap });

    await expect(
      buyer.sendTransaction({ to: await sale.getAddress(), value: 1n })
    ).to.be.revertedWith("CAP_REACHED");
  });

  it("allows refunds before finalize and burns VIN", async function () {
    const [, buyer] = await ethers.getSigners();
    const { vin, sale } = await deploySaleFixture("1");

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();

    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("15000000", 18))).wait();

    await buyer.sendTransaction({ to: await sale.getAddress(), value: ethers.parseEther("1") });

    const vinBefore = await vin.balanceOf(buyer.address);
    await (await sale.connect(buyer).refund(ethers.parseEther("0.4"))).wait();
    const vinAfter = await vin.balanceOf(buyer.address);

    expect(vinBefore - vinAfter).to.equal(ethers.parseEther("0.4") * VIN_PER_ETH);
    expect(await sale.totalRaised()).to.equal(ethers.parseEther("0.6"));
  });

  it("only owner can finalize", async function () {
    const [, buyer] = await ethers.getSigners();
    const { vin, sale, cap } = await deploySaleFixture("1");

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();
    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("15000000", 18))).wait();
    await (await vin.transferOwnership(await sale.getAddress())).wait();

    await buyer.sendTransaction({ to: await sale.getAddress(), value: cap });

    await expect(sale.connect(buyer).finalize())
      .to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount")
      .withArgs(buyer.address);
  });

  it("finalizes only when cap is met, seeds LP, and enables transfers", async function () {
    const [, buyer] = await ethers.getSigners();
    const { vin, sale, seeder, cap } = await deploySaleFixture("1");

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();

    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("15000000", 18))).wait();
    await (await vin.transferOwnership(await sale.getAddress())).wait();

    await buyer.sendTransaction({ to: await sale.getAddress(), value: cap });

    await expect(sale.finalize()).to.emit(sale, "Finalized");

    expect(await vin.transfersEnabled()).to.equal(true);
    expect(await seeder.totalSeedCalls()).to.equal(1n);
    expect(await seeder.lastSeedAmount()).to.equal(cap * VIN_PER_ETH);
  });

  it("sends 20 ETH to LP and remainder to DAO on finalize when cap exceeds 20 ETH", async function () {
    const [owner, buyer, dao] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Seeder = await ethers.getContractFactory("MockLiquiditySeeder");
    const seeder = await Seeder.deploy();
    await seeder.waitForDeployment();

    const cap = ethers.parseEther("40");
    const Sale = await ethers.getContractFactory("VinSale");
    const sale = await Sale.deploy(owner.address, await vin.getAddress(), dao.address, await seeder.getAddress(), cap);
    await sale.waitForDeployment();

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();
    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("450000000", 18))).wait();
    await (await vin.transferOwnership(await sale.getAddress())).wait();

    const daoBefore = await ethers.provider.getBalance(dao.address);

    await buyer.sendTransaction({ to: await sale.getAddress(), value: cap });
    await sale.finalize();

    const daoAfter = await ethers.provider.getBalance(dao.address);
    expect(daoAfter - daoBefore).to.equal(ethers.parseEther("20"));
    expect(await ethers.provider.getBalance(await seeder.getAddress())).to.equal(ethers.parseEther("20"));
  });

  it("blocks commits and refunds after finalize and blocks early finalize", async function () {
    const [, buyer] = await ethers.getSigners();
    const { vin, sale, cap } = await deploySaleFixture("1");

    await (await vin.setAllowlist(await sale.getAddress(), true)).wait();
    await (await vin.setSaleContract(await sale.getAddress())).wait();
    await (await vin.mint(await sale.getAddress(), ethers.parseUnits("15000000", 18))).wait();
    await (await vin.transferOwnership(await sale.getAddress())).wait();

    await expect(sale.finalize()).to.be.revertedWith("CAP_NOT_MET");

    await buyer.sendTransaction({ to: await sale.getAddress(), value: cap });
    await sale.finalize();

    await expect(buyer.sendTransaction({ to: await sale.getAddress(), value: 1n })).to.be.revertedWith(
      "FINALIZED"
    );
    await expect(sale.connect(buyer).refund(ethers.parseEther("0.1"))).to.be.revertedWith("FINALIZED");
  });
});
