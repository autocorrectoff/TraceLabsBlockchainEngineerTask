//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Bank {
    address private owner;
    uint256 private deployedAt;
    IERC20 private _token;
    uint256 private rewardPool;
    uint256 private totalDeposits;
    uint256 private T;
    mapping(address => uint256) private deposits;
    address[] private depositorsList;
    address[] private withdrawersList;

    constructor(address token, uint256 duration) {
        owner = msg.sender;
        deployedAt = block.timestamp;
        _token = IERC20(token);
        T = duration;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier checkTokenBalance(address user, uint256 amount) {
        require(_token.balanceOf(user) >= amount, "Insufficient tokens");
        _;
    }

    error DepositPeriodExpired(string message);
    error AssetLocked(string message);
    error NoDepositFound(string message);
    error GenericError(string message);

    function fundRewardPool(uint256 amount) external onlyOwner {
        _token.transferFrom(msg.sender, address(this), amount);
        rewardPool = amount;
    }

    function deposit(uint256 amount)
        external
        checkTokenBalance(msg.sender, amount)
    {
        if (!_isClosedForDeposit()) {
            _token.transferFrom(msg.sender, address(this), amount);
            deposits[msg.sender] += amount;
            totalDeposits += amount;
            _addToDepositors(msg.sender);
        } else {
            revert DepositPeriodExpired("Deposit period has expired");
        }
    }

    function withdraw() external {
        address user = msg.sender;
        uint256 userDeposit = _getUserDeposit(user);
        if (userDeposit <= 0) {
            revert GenericError(
                "User already withdrew his deposit or user not found"
            );
        }
        if (_isLocked()) {
            revert AssetLocked("Asset lock period is still in effect");
        }
        if (
            (block.timestamp > (deployedAt + 2 * T)) &&
            (block.timestamp < (deployedAt + 3 * T))
        ) {
            uint256 reward = _calculateR1() / ((userDeposit * 100) / totalDeposits);
            uint256 userTotalAmount = userDeposit + reward;
            _transferERC20(user, userTotalAmount);
            _addToWithdrawers(user);
            deposits[user] -= userDeposit;
        } else if (
            (block.timestamp > (deployedAt + 3 * T)) &&
            (block.timestamp < (deployedAt + 4 * T))
        ) {
            uint256 reward1 = _calculateR1() / ((userDeposit * 100) / totalDeposits);
            uint256 reward2 = _calculateR2() / ((userDeposit * 100) / totalDeposits);
            uint256 userTotalAmount = userDeposit + reward1 + reward2;
            _transferERC20(user, userTotalAmount);
            _addToWithdrawers(user);
            deposits[user] -= userDeposit;
        } else if (block.timestamp > (deployedAt + 4 * T)) {
            uint256 reward1 = _calculateR1() / ((userDeposit * 100) / totalDeposits);
            uint256 reward2 = _calculateR2() / ((userDeposit * 100) / totalDeposits);
            uint256 reward3 = _calculateR3() / ((userDeposit * 100) / totalDeposits);
            uint256 userTotalAmount = userDeposit + reward1 + reward2 + reward3;
            _transferERC20(user, userTotalAmount);
            _addToWithdrawers(user);
            deposits[user] -= userDeposit;
        } else {
            _transferERC20(user, userDeposit);
            _addToWithdrawers(user);
            deposits[user] -= userDeposit;
        }
    }

    function ownerWithdraw() public onlyOwner {
        if (
            block.timestamp < (deployedAt + 4 * T) &&
            (depositorsList.length == withdrawersList.length)
        ) {
            uint256 balance = _token.balanceOf(address(this));
            _token.transfer(owner, balance);
        } else {
            revert GenericError("No all users withdrew their funds");
        }
    }

    function _isClosedForDeposit() private view returns (bool) {
        return block.timestamp > (deployedAt + T);
    }

    function _isLocked() private view returns (bool) {
        return
            _isClosedForDeposit() && (block.timestamp < (deployedAt + 2 * T));
    }

    function _transferERC20(address to, uint256 amount) private {
        uint256 balance = _token.balanceOf(address(this));
        require(amount <= balance, "Contract's token balance is too low");
        _token.transfer(to, amount);
    }

    // 20% of the reward pool
    function _calculateR1() private view returns (uint256) {
        return (rewardPool / 100) * 20;
    }

    // 30% of the reward pool
    function _calculateR2() private view returns (uint256) {
        console.log("R2 in action");
        return (rewardPool / 100) * 30;
    }

    // 50% of the reward pool
    function _calculateR3() private view returns (uint256) {
        console.log("R3 in action");
        return (rewardPool / 100) * 50;
    }

    function _getUserDeposit(address user) private view returns (uint256) {
        uint256 userDeposit = deposits[user];
        if (userDeposit <= 0) {
            revert NoDepositFound("Deposit for the given address is 0");
        }
        return userDeposit;
    }

    function _addToDepositors(address user) private {
        if (deposits[user] <= 0) {
            if (depositorsList.length > 0) {
                depositorsList.push(user);
            } else {
                depositorsList = [user];
            }
        }
    }

    function _addToWithdrawers(address user) private {
        if (withdrawersList.length > 0) {
            withdrawersList.push(user);
        } else {
            withdrawersList = [user];
        }
    }
}
