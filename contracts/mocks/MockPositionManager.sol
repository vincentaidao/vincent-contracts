// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IPositionManagerMinimal} from "../interfaces/IPositionManagerMinimal.sol";

contract MockPositionManager is IPositionManagerMinimal {
    PoolKey public lastKey;
    uint160 public lastSqrtPriceX96;
    bytes public lastUnlockData;
    uint256 public lastDeadline;
    uint256 public lastValue;
    uint256 public nextTokenIdValue;

    constructor(uint256 nextTokenId_) {
        nextTokenIdValue = nextTokenId_;
    }

    function initializePool(PoolKey calldata key, uint160 sqrtPriceX96) external payable returns (int24) {
        lastKey = key;
        lastSqrtPriceX96 = sqrtPriceX96;
        return 0;
    }

    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable {
        lastUnlockData = unlockData;
        lastDeadline = deadline;
        lastValue = msg.value;
    }

    function nextTokenId() external view returns (uint256) {
        return nextTokenIdValue;
    }
}
