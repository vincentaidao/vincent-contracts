// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAllowanceTransfer {
    struct PermitDetails {
        address token;
        uint160 amount;
        uint48 expiration;
        uint48 nonce;
    }

    struct PermitSingle {
        PermitDetails details;
        address spender;
        uint256 sigDeadline;
    }

    struct PermitBatch {
        PermitDetails[] details;
        address spender;
        uint256 sigDeadline;
    }

    function allowance(address user, address token, address spender)
        external
        view
        returns (uint160 amount, uint48 expiration, uint48 nonce);

    function approve(address token, address spender, uint160 amount, uint48 expiration) external;

    function permit(address owner, PermitSingle calldata permitSingle, bytes calldata signature) external;

    function permit(address owner, PermitBatch calldata permitBatch, bytes calldata signature) external;

    function transferFrom(address from, address to, uint160 amount, address token) external;
}
