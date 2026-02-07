// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILiquiditySeederLike {
    function seed(uint256 tokenAmount) external payable;
}

contract MockSaleCaller {
    function callSeed(address seeder, uint256 tokenAmount) external payable {
        ILiquiditySeederLike(seeder).seed{value: msg.value}(tokenAmount);
    }
}
