import { expect } from "chai";
import { ethers } from "hardhat";

const ONE = 10n ** 18n;

describe("VIN", function () {
  it("blocks transfers until enabled unless allowlisted", async function () {
    const [owner, alice, bob] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    await (await vin.mint(alice.address, 10n * ONE)).wait();

    await expect(vin.connect(alice).transfer(bob.address, 1n * ONE)).to.be.revertedWith(
      "VIN: transfers disabled"
    );

    await (await vin.setAllowlist(alice.address, true)).wait();
    await expect(vin.connect(alice).transfer(bob.address, 1n * ONE)).to.not.be.reverted;

    await (await vin.setAllowlist(alice.address, false)).wait();
    await (await vin.setAllowlist(bob.address, true)).wait();
    await expect(vin.connect(alice).transfer(bob.address, 1n * ONE)).to.not.be.reverted;
  });

  it("only sale can enable transfers and burn for refunds", async function () {
    const [owner, sale, buyer] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    await (await vin.mint(buyer.address, 10n * ONE)).wait();

    await expect(vin.connect(buyer).enableTransfersAfterSale()).to.be.revertedWith("VIN: not sale");

    await (await vin.setSaleContract(sale.address)).wait();
    await expect(vin.connect(sale).enableTransfersAfterSale()).to.not.be.reverted;
    expect(await vin.transfersEnabled()).to.equal(true);

    await (await vin.mint(buyer.address, 5n * ONE)).wait();
    const burnAmount = 3n * ONE;
    await expect(vin.connect(buyer).saleBurn(buyer.address, burnAmount)).to.be.revertedWith("VIN: not sale");

    const balanceBefore = await vin.balanceOf(buyer.address);
    await (await vin.connect(sale).saleBurn(buyer.address, burnAmount)).wait();
    const balanceAfter = await vin.balanceOf(buyer.address);
    expect(balanceAfter).to.equal(balanceBefore - burnAmount);
  });

  it("only airdrop can burn unclaimed tokens", async function () {
    const [owner, airdrop] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    await (await vin.mint(airdrop.address, 4n * ONE)).wait();

    await expect(vin.connect(airdrop).airdropBurn(1n * ONE)).to.be.revertedWith("VIN: not airdrop");

    await (await vin.setAirdropContract(airdrop.address)).wait();
    const balanceBefore = await vin.balanceOf(airdrop.address);
    await (await vin.connect(airdrop).airdropBurn(2n * ONE)).wait();
    const balanceAfter = await vin.balanceOf(airdrop.address);
    expect(balanceAfter).to.equal(balanceBefore - 2n * ONE);
  });
});
