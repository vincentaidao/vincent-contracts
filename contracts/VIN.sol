// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title VIN
/// @notice ERC20 governance token for VincentDAO with Snapshot-compatible delegation.
/// @dev Owner can mint. For production, replace with immutable issuance rules.
contract VIN is ERC20, ERC20Permit, ERC20Votes, Ownable {
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

    // --- ERC20Votes overrides ---

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function _mint(address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, value);
    }

    function _burn(address account, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, value);
    }
}
