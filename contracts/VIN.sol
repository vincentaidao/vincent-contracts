// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title VIN
/// @notice ERC20 governance token for VincentDAO with Snapshot-compatible delegation.
/// @dev Owner can mint. For production, replace with immutable issuance rules.
contract VIN is ERC20, ERC20Permit, ERC20Votes, Ownable {
    bool public transfersEnabled;
    mapping(address => bool) public allowlisted;
    mapping(address => bool) public isSaleContract;

    event TransfersEnabled();
    event AllowlistUpdated(address indexed account, bool allowed);
    event SaleContractUpdated(address indexed account, bool allowed);

    modifier onlySale() {
        require(isSaleContract[msg.sender], "VIN: not sale");
        _;
    }

    constructor(address initialOwner)
        ERC20("Vincent", "VIN")
        ERC20Permit("Vincent")
        Ownable(initialOwner)
    {}

    /// @notice Mint new tokens.
    /// @dev Restricted to owner. No initial mint by default.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Enable token transfers after sale finalization.
    function enableTransfersAfterSale() external onlySale {
        transfersEnabled = true;
        emit TransfersEnabled();
    }

    /// @notice Allow system contracts to transfer before global enable.
    function setAllowlist(address account, bool allowed) external onlyOwner {
        allowlisted[account] = allowed;
        emit AllowlistUpdated(account, allowed);
    }

    /// @notice Register sale contracts for burn privileges.
    function setSaleContract(address account, bool allowed) external onlyOwner {
        isSaleContract[account] = allowed;
        emit SaleContractUpdated(account, allowed);
    }

    /// @notice Burn tokens from a buyer during refunds.
    function saleBurn(address from, uint256 amount) external onlySale {
        _burn(from, amount);
    }

    // --- ERC20Votes overrides ---

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        if (from != address(0) && to != address(0)) {
            require(
                transfersEnabled || allowlisted[from] || allowlisted[to],
                "VIN: transfers disabled"
            );
        }
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
