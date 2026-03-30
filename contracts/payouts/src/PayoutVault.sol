// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PayoutVault
 * @notice A generic vault to receive and store ERC20 tokens from cross-chain payouts
 * @dev This contract will be called by Squid's post-hook after each swap
 * @dev Deploy one instance per token you want to manage
 * @dev Examples: cCOP on Celo, cREAL on Celo, mxnB on Arbitrum, BRL1 on Polygon
 */
contract PayoutVault {
    // The ERC20 token this vault manages
    IERC20 public immutable token;

    // Owner of the vault (commerce)
    address public immutable owner;

    // Track total deposits per commerce
    mapping(address => uint256) public commerceBalances;

    // Track total deposits in the vault
    uint256 public totalDeposits;

    // Track claimed payouts to prevent double-claiming
    mapping(string => bool) public claimedPayouts;

    // Track which commerce owns each payoutId
    mapping(string => address) public payoutToCommerce;

    // Events
    event Deposit(address indexed commerce, uint256 amount, string payoutId);
    event Withdrawal(
        address indexed commerce,
        address indexed to,
        uint256 amount,
        string payoutId
    );

    // Errors
    error Unauthorized();
    error ZeroAmount();
    error InsufficientBalance();
    error TransferFailed();
    error AlreadyClaimed();
    error InvalidCommerce();
    error PayoutAlreadyExists();

    /**
     * @notice Constructor to initialize the vault
     * @param _token Address of the ERC20 token (e.g., cCOP, cREAL, mxnB, BRL1)
     * @param _owner Address of the commerce owner
     */
    constructor(address _token, address _owner) {
        require(_token != address(0), "Invalid token address");
        require(_owner != address(0), "Invalid owner address");

        token = IERC20(_token);
        owner = _owner;
    }

    /**
     * @notice Deposit tokens into the vault
     * @dev This will be called by Squid's post-hook after cross-chain swap
     * @dev Links payoutId to commerce to prevent cross-commerce withdrawal attacks
     * @param commerce Address of the commerce receiving the payout
     * @param amount Amount of tokens to deposit
     * @param payoutId Unique ID of the payout for tracking
     */
    function deposit(
        address commerce,
        uint256 amount,
        string calldata payoutId
    ) external {
        if (amount == 0) revert ZeroAmount();

        // Prevent duplicate payoutIds (security: each payoutId should be unique)
        if (payoutToCommerce[payoutId] != address(0))
            revert PayoutAlreadyExists();

        // Link payoutId to commerce
        payoutToCommerce[payoutId] = commerce;

        // Transfer tokens from sender to vault
        bool success = token.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        // Update balances
        commerceBalances[commerce] += amount;
        totalDeposits += amount;

        emit Deposit(commerce, amount, payoutId);
    }

    /**
     * @notice Withdraw tokens on behalf of a commerce (for payout claims)
     * @dev Only owner (backend) can execute, withdraws from commerce linked to payoutId
     * @dev Used when end-users claim their payouts after email verification
     * @dev Prevents double-claiming by tracking payoutId on-chain
     * @dev Commerce is automatically determined from payoutToCommerce mapping
     * @param to Address to send tokens to (the end-user claiming)
     * @param amount Amount of tokens to withdraw
     * @param payoutId Unique identifier for this payout (determines which commerce to withdraw from)
     */
    function withdrawFor(
        address to,
        uint256 amount,
        string calldata payoutId
    ) external {
        if (msg.sender != owner) revert Unauthorized();
        if (amount == 0) revert ZeroAmount();
        if (claimedPayouts[payoutId]) revert AlreadyClaimed();

        // Get commerce from payoutId (single source of truth)
        address commerce = payoutToCommerce[payoutId];
        if (commerce == address(0)) revert InvalidCommerce();

        // Validate sufficient balance
        if (commerceBalances[commerce] < amount) revert InsufficientBalance();

        // Mark payout as claimed
        claimedPayouts[payoutId] = true;

        // Update balances
        commerceBalances[commerce] -= amount;
        totalDeposits -= amount;

        // Transfer tokens to recipient
        bool success = token.transfer(to, amount);
        if (!success) revert TransferFailed();

        emit Withdrawal(commerce, to, amount, payoutId);
    }

    /**
     * @notice Get the balance of a specific commerce
     * @param commerce Address of the commerce
     * @return Balance of the commerce in the vault
     */
    function getBalance(address commerce) external view returns (uint256) {
        return commerceBalances[commerce];
    }

    /**
     * @notice Get the total balance held by the vault
     * @return Total balance of tokens in the vault
     */
    function getTotalBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
