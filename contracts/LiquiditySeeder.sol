// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";
import {FullMath} from "@uniswap/v4-core/src/libraries/FullMath.sol";

import {IPositionManagerMinimal} from "./interfaces/IPositionManagerMinimal.sol";
import {IAllowanceTransfer} from "./interfaces/IAllowanceTransfer.sol";

/// @title LiquiditySeeder
/// @notice Seeds a Uniswap v4 full-range position using VIN + native ETH.
contract LiquiditySeeder is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;

    address public immutable token;
    address public immutable poolManager;
    address public immutable positionManager;
    address public immutable permit2;
    address public immutable daoWallet;
    address public immutable locker;

    uint24 public constant FEE = 0;
    int24 public constant TICK_SPACING = 10;

    event Seeded(bytes32 indexed poolId, uint256 indexed tokenId, uint128 liquidity, int24 tickLower, int24 tickUpper);

    constructor(
        address initialOwner,
        address _token,
        address _poolManager,
        address _positionManager,
        address _permit2,
        address _daoWallet,
        address _locker
    ) Ownable(initialOwner) {
        token = _token;
        poolManager = _poolManager;
        positionManager = _positionManager;
        permit2 = _permit2;
        daoWallet = _daoWallet;
        locker = _locker;
    }

    receive() external payable {}

    /// @notice Seed a full-range position using all ETH + tokenAmount VIN held by this contract.
    function seed(uint256 tokenAmount) external onlyOwner nonReentrant {
        uint256 ethAmount = address(this).balance;
        require(ethAmount > 0, "NO_ETH");
        require(tokenAmount > 0, "NO_TOKEN");

        (PoolKey memory poolKey, uint256 amount0, uint256 amount1) = _buildPoolKey(ethAmount, tokenAmount);
        (uint128 liquidity, int24 tickLower, int24 tickUpper) = _initializeAndQuote(poolKey, amount0, amount1);

        _approvePermit2(tokenAmount);

        uint256 tokenId = IPositionManagerMinimal(positionManager).nextTokenId();
        bytes memory unlockData = _buildUnlockData(poolKey, amount0, amount1, liquidity, tickLower, tickUpper);

        IPositionManagerMinimal(positionManager).modifyLiquidities{value: ethAmount}(
            unlockData,
            block.timestamp + 20 minutes
        );

        bytes32 poolId = PoolId.unwrap(poolKey.toId());
        emit Seeded(poolId, tokenId, liquidity, tickLower, tickUpper);
    }

    function _buildPoolKey(uint256 ethAmount, uint256 tokenAmount)
        internal
        view
        returns (PoolKey memory poolKey, uint256 amount0, uint256 amount1)
    {
        Currency currency0 = CurrencyLibrary.ADDRESS_ZERO;
        Currency currency1 = Currency.wrap(token);
        amount0 = ethAmount;
        amount1 = tokenAmount;

        if (currency1 < currency0) {
            (currency0, currency1) = (currency1, currency0);
            (amount0, amount1) = (amount1, amount0);
        }

        poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0))
        });
    }

    function _initializeAndQuote(PoolKey memory poolKey, uint256 amount0, uint256 amount1)
        internal
        returns (uint128 liquidity, int24 tickLower, int24 tickUpper)
    {
        uint160 sqrtPriceX96 = _sqrtPriceX96(amount0, amount1);
        IPositionManagerMinimal(positionManager).initializePool(poolKey, sqrtPriceX96);

        tickLower = TickMath.minUsableTick(TICK_SPACING);
        tickUpper = TickMath.maxUsableTick(TICK_SPACING);

        uint160 sqrtPriceLower = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtPriceUpper = TickMath.getSqrtPriceAtTick(tickUpper);

        liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLower,
            sqrtPriceUpper,
            amount0,
            amount1
        );
    }

    function _approvePermit2(uint256 tokenAmount) internal {
        IERC20(token).approve(permit2, tokenAmount);
        IAllowanceTransfer(permit2).approve(token, positionManager, uint160(tokenAmount), type(uint48).max);
    }

    function _buildUnlockData(
        PoolKey memory poolKey,
        uint256 amount0,
        uint256 amount1,
        uint128 liquidity,
        int24 tickLower,
        int24 tickUpper
    ) internal view returns (bytes memory) {
        bytes memory actions = new bytes(4);
        bytes[] memory params = new bytes[](4);

        actions[0] = bytes1(uint8(Actions.MINT_POSITION));
        params[0] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            uint256(liquidity),
            uint128(amount0),
            uint128(amount1),
            locker,
            bytes("")
        );

        actions[1] = bytes1(uint8(Actions.SETTLE_PAIR));
        params[1] = abi.encode(poolKey.currency0, poolKey.currency1);

        actions[2] = bytes1(uint8(Actions.SWEEP));
        params[2] = abi.encode(poolKey.currency0, daoWallet);

        actions[3] = bytes1(uint8(Actions.SWEEP));
        params[3] = abi.encode(poolKey.currency1, daoWallet);

        return abi.encode(actions, params);
    }

    function _sqrtPriceX96(uint256 amount0, uint256 amount1) internal pure returns (uint160) {
        require(amount0 > 0 && amount1 > 0, "BAD_AMOUNTS");
        uint256 ratioX192 = FullMath.mulDiv(amount1, 1 << 192, amount0);
        uint256 sqrtRatioX96 = Math.sqrt(ratioX192);
        return uint160(sqrtRatioX96);
    }

    /// @notice Rescue funds if seeding is postponed.
    function rescue(address to, uint256 tokenAmount, uint256 ethAmount) external onlyOwner nonReentrant {
        if (tokenAmount > 0) {
            IERC20(token).safeTransfer(to, tokenAmount);
        }
        if (ethAmount > 0) {
            (bool success, ) = to.call{value: ethAmount}("");
            require(success, "ETH_TRANSFER_FAILED");
        }
    }
}
