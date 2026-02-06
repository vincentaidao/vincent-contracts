// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAllowanceTransfer} from "../interfaces/IAllowanceTransfer.sol";

contract MockPermit2 is IAllowanceTransfer {
    address public lastToken;
    address public lastSpender;
    uint160 public lastAmount;
    uint48 public lastExpiration;

    function allowance(address, address, address) external pure returns (uint160, uint48, uint48) {
        return (0, 0, 0);
    }

    function approve(address token, address spender, uint160 amount, uint48 expiration) external {
        lastToken = token;
        lastSpender = spender;
        lastAmount = amount;
        lastExpiration = expiration;
    }

    function permit(address, PermitSingle calldata, bytes calldata) external pure {}

    function permit(address, PermitBatch calldata, bytes calldata) external pure {}

    function transferFrom(address, address, uint160, address) external pure {}
}
