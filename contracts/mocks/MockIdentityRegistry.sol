// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockIdentityRegistry {
    mapping(uint256 => address) public wallets;

    function setAgentWallet(uint256 agentId, address wallet) external {
        wallets[agentId] = wallet;
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return wallets[agentId];
    }
}
