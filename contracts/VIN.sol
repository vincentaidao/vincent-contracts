// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title VIN
/// @notice Minimal ERC20 governance token for VincentDAO.
/// @dev Owner can mint initially. For production, replace with immutable issuance rules.
contract VIN is ERC20, ERC20Permit, Ownable {
    constructor(address initialOwner) ERC20("Vincent", "VIN") ERC20Permit("Vincent") Ownable(initialOwner) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
