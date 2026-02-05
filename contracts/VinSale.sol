// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IVIN is IERC20 {
    function enableTransfersAfterSale() external;
    function saleBurn(address from, uint256 amount) external;
}

/// @title VinSale
/// @notice Fixed-price ETH sale with refunds and post-finalize claims.
/// @dev Sale can only be finalized once the hard cap is met. No time-based end and no early finalize.
contract VinSale is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant VIN_PER_ETH = 5_000_000; // 5,000,000 VIN per 1 ETH
    uint256 public immutable totalCapWei; // in wei

    address public immutable daoWallet;
    IVIN public immutable vin;

    bool public finalized;
    uint256 public totalRaised;

    mapping(address => uint256) public contributed;
    mapping(address => uint256) public vinOwed;

    event Commit(address indexed buyer, uint256 ethAccepted, uint256 vinAmount);
    event Refund(address indexed buyer, uint256 ethAmount, uint256 vinAmount);
    event Finalized(uint256 treasuryEth, uint256 lpEth, uint256 lpVin);

    constructor(
        address initialOwner,
        address _vin,
        address _daoWallet,
        uint256 _totalCapWei
    ) Ownable(initialOwner) {
        require(_totalCapWei > 0, "INVALID_CAP");
        vin = IVIN(_vin);
        daoWallet = _daoWallet;
        totalCapWei = _totalCapWei;
    }

    receive() external payable {
        commit();
    }

    function commit() public payable {
        require(!finalized, "FINALIZED");
        require(msg.value > 0, "ZERO");

        uint256 remaining = totalCapWei > totalRaised ? totalCapWei - totalRaised : 0;
        require(remaining > 0, "CAP_REACHED");

        uint256 accepted = msg.value;
        if (accepted > remaining) {
            accepted = remaining;
        }

        uint256 vinAmount = accepted * VIN_PER_ETH;
        contributed[msg.sender] += accepted;
        vinOwed[msg.sender] += vinAmount;
        totalRaised += accepted;

        // Immediate delivery from sale inventory.
        IERC20(address(vin)).safeTransfer(msg.sender, vinAmount);

        if (accepted < msg.value) {
            uint256 refundAmount = msg.value - accepted;
            (bool success, ) = msg.sender.call{value: refundAmount}("");
            require(success, "REFUND_FAILED");
        }

        emit Commit(msg.sender, accepted, vinAmount);
    }

    function refund(uint256 ethAmount) external {
        require(!finalized, "FINALIZED");
        require(ethAmount > 0, "ZERO");

        uint256 contributedAmount = contributed[msg.sender];
        require(contributedAmount >= ethAmount, "INSUFFICIENT");

        uint256 vinAmount = ethAmount * VIN_PER_ETH;
        contributed[msg.sender] = contributedAmount - ethAmount;
        vinOwed[msg.sender] -= vinAmount;
        totalRaised -= ethAmount;

        vin.saleBurn(msg.sender, vinAmount);

        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "REFUND_FAILED");

        emit Refund(msg.sender, ethAmount, vinAmount);
    }

    function finalize(address liquiditySeeder) external onlyOwner {
        require(!finalized, "FINALIZED");
        require(totalRaised == totalCapWei, "CAP_NOT_MET");

        finalized = true;

        uint256 lpEth = totalRaised > 30 ether ? 30 ether : totalRaised;
        uint256 treasuryEth = totalRaised > lpEth ? totalRaised - lpEth : 0;

        if (treasuryEth > 0) {
            (bool treasurySuccess, ) = daoWallet.call{value: treasuryEth}("");
            require(treasurySuccess, "TREASURY_FAILED");
        }

        uint256 lpVinAmount = lpEth * VIN_PER_ETH;

        // Transfer ETH + VIN to seeder contract for LP creation.
        if (lpEth > 0) {
            (bool lpSuccess, ) = liquiditySeeder.call{value: lpEth}("");
            require(lpSuccess, "LP_ETH_FAILED");
        }

        if (lpVinAmount > 0) {
            IERC20(address(vin)).safeTransfer(liquiditySeeder, lpVinAmount);
        }

        // Call seeder.
        (bool seedSuccess, ) = liquiditySeeder.call(
            abi.encodeWithSignature("seed(uint256)", lpVinAmount)
        );
        require(seedSuccess, "SEED_FAILED");

        vin.enableTransfersAfterSale();

        emit Finalized(treasuryEth, lpEth, lpVinAmount);
    }
}
