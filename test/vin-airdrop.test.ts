import { expect } from "chai";
import { ethers } from "hardhat";

const CLAIM_AMOUNT = ethers.parseEther("12000");

describe("VINAirdrop", function () {
  it("claims when enabled and registry wallet is set", async function () {
    const [owner, claimant] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Registry = await ethers.getContractFactory("MockIdentityRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Airdrop = await ethers.getContractFactory("VINAirdrop");
    const airdrop = await Airdrop.deploy(owner.address, await vin.getAddress(), await registry.getAddress());
    await airdrop.waitForDeployment();

    await (await vin.mint(await airdrop.getAddress(), CLAIM_AMOUNT)).wait();
    await (await vin.setAllowlist(await airdrop.getAddress(), true)).wait();
    await (await registry.setAgentWallet(1, claimant.address)).wait();

    await expect(airdrop.claim(1)).to.be.revertedWith("CLAIM_DISABLED");

    await (await airdrop.setClaimEnabled(true)).wait();
    await expect(airdrop.claim(1)).to.emit(airdrop, "Claimed");

    expect(await vin.balanceOf(claimant.address)).to.equal(CLAIM_AMOUNT);
  });

  it("only owner can manage claim settings", async function () {
    const [owner, attacker] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Registry = await ethers.getContractFactory("MockIdentityRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Airdrop = await ethers.getContractFactory("VINAirdrop");
    const airdrop = await Airdrop.deploy(owner.address, await vin.getAddress(), await registry.getAddress());
    await airdrop.waitForDeployment();

    await expect(airdrop.connect(attacker).setClaimEnabled(true)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await expect(airdrop.connect(attacker).setClaimEndBlock(100)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await expect(airdrop.connect(attacker).enableClaimsForDuration(10)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("exposes eligibility view", async function () {
    const [owner, claimant] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Registry = await ethers.getContractFactory("MockIdentityRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Airdrop = await ethers.getContractFactory("VINAirdrop");
    const airdrop = await Airdrop.deploy(owner.address, await vin.getAddress(), await registry.getAddress());
    await airdrop.waitForDeployment();

    await (await vin.mint(await airdrop.getAddress(), CLAIM_AMOUNT)).wait();
    await (await vin.setAllowlist(await airdrop.getAddress(), true)).wait();

    const [invalidEligible, invalidReason] = await airdrop.eligibility(25_000);
    expect(invalidEligible).to.equal(false);
    expect(invalidReason).to.equal("INVALID_AGENT");

    const [noWalletEligible, noWalletReason] = await airdrop.eligibility(7);
    expect(noWalletEligible).to.equal(false);
    expect(noWalletReason).to.equal("NO_WALLET");

    await (await registry.setAgentWallet(7, claimant.address)).wait();
    const [eligible, reason] = await airdrop.eligibility(7);
    expect(eligible).to.equal(true);
    expect(reason).to.equal("ELIGIBLE");
    expect(await airdrop.isEligible(7)).to.equal(true);
    expect(await airdrop.isEligibleForAgent(7)).to.equal(true);
  });

  it("blocks invalid or duplicate claims", async function () {
    const [owner, claimant] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Registry = await ethers.getContractFactory("MockIdentityRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Airdrop = await ethers.getContractFactory("VINAirdrop");
    const airdrop = await Airdrop.deploy(owner.address, await vin.getAddress(), await registry.getAddress());
    await airdrop.waitForDeployment();

    await (await vin.mint(await airdrop.getAddress(), CLAIM_AMOUNT * 2n)).wait();
    await (await vin.setAllowlist(await airdrop.getAddress(), true)).wait();
    await (await registry.setAgentWallet(42, claimant.address)).wait();
    await (await airdrop.setClaimEnabled(true)).wait();

    await expect(airdrop.claim(25_000)).to.be.revertedWith("INVALID_AGENT");

    await expect(airdrop.claim(1)).to.be.revertedWith("NO_WALLET");

    await airdrop.claim(42);
    await expect(airdrop.claim(42)).to.be.revertedWith("ALREADY_CLAIMED");
  });

  it("respects claim end block and duration helper", async function () {
    const [owner, claimant] = await ethers.getSigners();

    const VIN = await ethers.getContractFactory("VIN");
    const vin = await VIN.deploy(owner.address);
    await vin.waitForDeployment();

    const Registry = await ethers.getContractFactory("MockIdentityRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Airdrop = await ethers.getContractFactory("VINAirdrop");
    const airdrop = await Airdrop.deploy(owner.address, await vin.getAddress(), await registry.getAddress());
    await airdrop.waitForDeployment();

    await (await vin.mint(await airdrop.getAddress(), CLAIM_AMOUNT)).wait();
    await (await vin.setAllowlist(await airdrop.getAddress(), true)).wait();
    await (await registry.setAgentWallet(2, claimant.address)).wait();

    await (await airdrop.enableClaimsForDuration(2)).wait();

    await airdrop.claim(2);

    const latest = await ethers.provider.getBlockNumber();
    await ethers.provider.send("hardhat_mine", ["0x3"]);

    await expect(airdrop.claim(3)).to.be.revertedWith("CLAIM_ENDED");
    await expect(airdrop.setClaimEndBlock(latest)).to.be.revertedWith("END_IN_PAST");
  });
});
