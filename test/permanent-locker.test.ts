import { expect } from "chai";
import { ethers } from "hardhat";

describe("PermanentLocker", function () {
  it("accepts ERC721 receipts and reverts all release attempts", async function () {
    const Locker = await ethers.getContractFactory("PermanentLocker");
    const locker = await Locker.deploy();
    await locker.waitForDeployment();

    const selector = await locker.onERC721Received(ethers.ZeroAddress, ethers.ZeroAddress, 1n, "0x");
    expect(selector).to.equal("0x150b7a02");

    await expect(locker.release(ethers.ZeroAddress, 1n, ethers.ZeroAddress)).to.be.revertedWithCustomError(
      locker,
      "LockedForever"
    );
  });
});
