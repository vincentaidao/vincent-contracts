// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IVIN is IERC20 {
    function enableTransfers() external;
}

/// @title VinSale
/// @notice Fixed-price ETH sale with refunds and post-finalize claims.
contract VinSale is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant VIN_PER_ETH = 6_000_000; // 6,000,000 VIN per 1 ETH
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable hardCap; // in wei

    address public immutable daoWallet;
    IVIN public immutable vin;

    bool public finalized;

    mapping(address => uint256) public contributed;
    mapping(address => uint256) public vinOwed;

    event Commit(address indexed buyer, uint256 ethAccepted, uint256 vinAmount);
    event Refund(address indexed buyer, uint256 ethAmount, uint256 vinAmount);
    event Claim(address indexed buyer, uint256 vinAmount);
    event Finalized(uint256 runwayEth, uint256 lpEth, uint256 lpVin);

    constructor(
        address initialOwner,
        address _vin,
        address _daoWallet,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _hardCap
    ) Ownable(initialOwner) {
        require(_startTime < _endTime, "INVALID_WINDOW");
        vin = IVIN(_vin);
        daoWallet = _daoWallet;
        startTime = _startTime;
        endTime = _endTime;
        hardCap = _hardCap;
    }

    receive() external payable {
        commit();
    }

    function commit() public payable {
        require(block.timestamp >= startTime, "SALE_NOT_STARTED");
        require(block.timestamp < endTime, "SALE_ENDED");
        require(!finalized, "FINALIZED");
        require(msg.value > 0, "ZERO");

        uint256 total = address(this).balance - msg.value;
        uint256 remaining = hardCap > total ? hardCap - total : 0;
        require(remaining > 0, "CAP_REACHED");

        uint256 accepted = msg.value;
        if (accepted > remaining) {
            accepted = remaining;
        }

        uint256 vinAmount = accepted * VIN_PER_ETH;
        contributed[msg.sender] += accepted;
        vinOwed[msg.sender] += vinAmount;

        if (accepted < msg.value) {
            uint256 refundAmount = msg.value - accepted;
            (bool success, ) = msg.sender.call{value: refundAmount}("");
            require(success, "REFUND_FAILED");
        }

        emit Commit(msg.sender, accepted, vinAmount);
    }

    function refund(uint256 ethAmount) external {
        require(block.timestamp < endTime, "SALE_ENDED");
        require(!finalized, "FINALIZED");
        require(ethAmount > 0, "ZERO");

        uint256 contributedAmount = contributed[msg.sender];
        require(contributedAmount >= ethAmount, "INSUFFICIENT");

        uint256 vinAmount = ethAmount * VIN_PER_ETH;
        contributed[msg.sender] = contributedAmount - ethAmount;
        vinOwed[msg.sender] -= vinAmount;

        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "REFUND_FAILED");

        emit Refund(msg.sender, ethAmount, vinAmount);
    }

    function claim() external {
        require(finalized, "NOT_FINALIZED");
        uint256 amount = vinOwed[msg.sender];
        require(amount > 0, "NOTHING_TO_CLAIM");
        vinOwed[msg.sender] = 0;
        IERC20(address(vin)).safeTransfer(msg.sender, amount);
        emit Claim(msg.sender, amount);
    }

    function finalize(address liquiditySeeder, uint256 lpVinAmount) external onlyOwner {
        require(!finalized, "FINALIZED");
        require(block.timestamp >= endTime, "SALE_ACTIVE");
        require(address(this).balance >= hardCap, "TARGET_NOT_MET");

        finalized = true;

        uint256 runwayEth = 10 ether;
        uint256 lpEth = 15 ether;

        (bool runwaySuccess, ) = daoWallet.call{value: runwayEth}("");
        require(runwaySuccess, "RUNWAY_FAILED");

        // Transfer ETH + VIN to seeder contract for LP creation.
        (bool lpSuccess, ) = liquiditySeeder.call{value: lpEth}("");
        require(lpSuccess, "LP_ETH_FAILED");

        IERC20(address(vin)).safeTransfer(liquiditySeeder, lpVinAmount);

        // Call seeder (currently placeholder).
        (bool seedSuccess, ) = liquiditySeeder.call(
            abi.encodeWithSignature("seed(uint256)", lpVinAmount)
        );
        require(seedSuccess, "SEED_FAILED");

        vin.enableTransfers();

        emit Finalized(runwayEth, lpEth, lpVinAmount);
    }
}
