// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/// @title PermanentLocker
/// @notice Permanently locks ERC721 positions by rejecting all withdrawals.
contract PermanentLocker is IERC721Receiver {
    error LockedForever();

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /// @notice No-withdraw safeguard (always reverts).
    function release(address, uint256, address) external pure {
        revert LockedForever();
    }
}
