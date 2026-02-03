// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IIdentityRegistry {
    function getAgentWallet(uint256 agentId) external view returns (address);
}

/// @title VINAirdrop
/// @notice Airdrop contract for eligible agents.
contract VINAirdrop is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_AGENT_ID = 25000;
    uint256 public constant CLAIM_AMOUNT = 18_000 ether;

    IERC20 public immutable vin;
    IIdentityRegistry public immutable registry;

    mapping(uint256 => bool) public claimed;
    uint256 public totalClaimedVin;
    bool public claimEnabled;

    event ClaimEnabledSet(bool enabled);
    event Claimed(uint256 indexed agentId, address indexed wallet, uint256 amount);

    constructor(address initialOwner, address vinToken, address registryAddress) Ownable(initialOwner) {
        vin = IERC20(vinToken);
        registry = IIdentityRegistry(registryAddress);
    }

    function setClaimEnabled(bool enabled) external onlyOwner {
        claimEnabled = enabled;
        emit ClaimEnabledSet(enabled);
    }

    function claim(uint256 agentId) external {
        require(claimEnabled, "CLAIM_DISABLED");
        require(agentId < MAX_AGENT_ID, "INVALID_AGENT");
        require(!claimed[agentId], "ALREADY_CLAIMED");

        address wallet = registry.getAgentWallet(agentId);
        require(wallet != address(0), "NO_WALLET");

        claimed[agentId] = true;
        totalClaimedVin += CLAIM_AMOUNT;
        vin.safeTransfer(wallet, CLAIM_AMOUNT);

        emit Claimed(agentId, wallet, CLAIM_AMOUNT);
    }
}
