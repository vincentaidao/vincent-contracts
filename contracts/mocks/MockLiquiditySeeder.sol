// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockLiquiditySeeder {
    uint256 public lastSeedAmount;
    uint256 public totalSeedCalls;

    event Seeded(uint256 amount, uint256 value);

    function seed(uint256 amount) external payable {
        lastSeedAmount = amount;
        totalSeedCalls += 1;
        emit Seeded(amount, msg.value);
    }

    receive() external payable {}
}
