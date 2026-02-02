// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";

interface IPositionManagerMinimal {
    function initializePool(PoolKey calldata key, uint160 sqrtPriceX96) external payable returns (int24);

    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;

    function nextTokenId() external view returns (uint256);
}
