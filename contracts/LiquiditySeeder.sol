// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title LiquiditySeeder
/// @notice Placeholder for Uniswap v4 LP seeding. Stores funds until seeding is implemented.
contract LiquiditySeeder is Ownable {
    using SafeERC20 for IERC20;

    address public immutable token;
    address public immutable poolManager;
    address public immutable positionManager;

    event SeedSkipped(address indexed caller, uint256 ethAmount, uint256 tokenAmount);

    constructor(address initialOwner, address _token, address _poolManager, address _positionManager)
        Ownable(initialOwner)
    {
        token = _token;
        poolManager = _poolManager;
        positionManager = _positionManager;
    }

    receive() external payable {}

    /// @notice Placeholder seed function. Does not interact with Uniswap v4 yet.
    /// @dev TODO: replace with actual v4 pool initialization and position mint.
    function seed(uint256 tokenAmount) external onlyOwner {
        uint256 ethAmount = address(this).balance;
        emit SeedSkipped(msg.sender, ethAmount, tokenAmount);
    }

    /// @notice Rescue funds if seeding is postponed.
    function rescue(address to, uint256 tokenAmount, uint256 ethAmount) external onlyOwner {
        if (tokenAmount > 0) {
            IERC20(token).safeTransfer(to, tokenAmount);
        }
        if (ethAmount > 0) {
            (bool success, ) = to.call{value: ethAmount}("");
            require(success, "ETH_TRANSFER_FAILED");
        }
    }
}
