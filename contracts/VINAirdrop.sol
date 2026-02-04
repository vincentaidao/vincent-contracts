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
    uint256 public constant CLAIM_AMOUNT = 12_000 ether;

    IERC20 public immutable vin;
    IIdentityRegistry public immutable registry;

    mapping(uint256 => bool) public claimed;
    uint256 public totalClaimedVin;
    bool public claimEnabled;
    uint256 public claimEndBlock;

    event ClaimEnabledSet(bool enabled);
    event ClaimEndBlockSet(uint256 endBlock);
    event ClaimWindowSet(uint256 startBlock, uint256 endBlock);
    event Claimed(uint256 indexed agentId, address indexed wallet, uint256 amount);

    /// @notice Returns eligibility status plus a reason string for the agent.
    function eligibility(uint256 agentId) public view returns (bool eligible, string memory reason) {
        if (agentId >= MAX_AGENT_ID) return (false, "INVALID_AGENT");

        address registered = registry.getAgentWallet(agentId);
        if (registered == address(0)) return (false, "NO_WALLET");
        return (true, "ELIGIBLE");
    }

    /// @notice Returns true if the agent is eligible based on registry data.
    function isEligible(uint256 agentId) public view returns (bool) {
        (bool eligible, ) = eligibility(agentId);
        return eligible;
    }

    /// @notice Returns true if the registered wallet for agentId is eligible based on registry data.
    function isEligibleForAgent(uint256 agentId) external view returns (bool) {
        return isEligible(agentId);
    }

    constructor(address initialOwner, address vinToken, address registryAddress) Ownable(initialOwner) {
        vin = IERC20(vinToken);
        registry = IIdentityRegistry(registryAddress);
    }

    function setClaimEnabled(bool enabled) external onlyOwner {
        claimEnabled = enabled;
        emit ClaimEnabledSet(enabled);
    }

    function setClaimEndBlock(uint256 endBlock) external onlyOwner {
        require(endBlock > block.number, "END_IN_PAST");
        claimEndBlock = endBlock;
        emit ClaimEndBlockSet(endBlock);
    }

    function enableClaimsForDuration(uint256 durationBlocks) external onlyOwner {
        require(durationBlocks > 0, "DURATION_ZERO");
        uint256 endBlock = block.number + durationBlocks;
        claimEndBlock = endBlock;
        claimEnabled = true;
        emit ClaimEndBlockSet(endBlock);
        emit ClaimEnabledSet(true);
        emit ClaimWindowSet(block.number, endBlock);
    }

    function claim(uint256 agentId) external {
        require(claimEnabled, "CLAIM_DISABLED");
        require(claimEndBlock == 0 || block.number <= claimEndBlock, "CLAIM_ENDED");
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
