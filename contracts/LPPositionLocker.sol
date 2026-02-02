// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/// @title LPPositionLocker
/// @notice Simple time-lock for ERC721 LP positions.
contract LPPositionLocker is Ownable, IERC721Receiver {
    uint256 public immutable unlockTime;

    constructor(address initialOwner, uint256 _unlockTime) Ownable(initialOwner) {
        unlockTime = _unlockTime;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function release(address nft, uint256 tokenId, address to) external onlyOwner {
        require(block.timestamp >= unlockTime, "LOCKED");
        // Transfer the NFT position out after unlock.
        (bool success, ) = nft.call(
            abi.encodeWithSignature(
                "safeTransferFrom(address,address,uint256)",
                address(this),
                to,
                tokenId
            )
        );
        require(success, "TRANSFER_FAILED");
    }
}
