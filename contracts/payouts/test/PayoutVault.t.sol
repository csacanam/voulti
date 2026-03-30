// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/PayoutVault.sol";

// Mock ERC20 token for testing
contract MockERC20 is Test {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    string public name = "Mock cCOP";
    string public symbol = "cCOP";
    uint8 public decimals = 18;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(
            allowance[from][msg.sender] >= amount,
            "Insufficient allowance"
        );

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;

        return true;
    }
}

contract PayoutVaultTest is Test {
    PayoutVault public vault;
    MockERC20 public testToken;

    address public owner = address(0x1);
    address public commerce = address(0x2);
    address public squidRouter = address(0x3);

    function setUp() public {
        // Deploy mock ERC20 token (could be cCOP, cREAL, mxnB, etc.)
        testToken = new MockERC20();

        // Deploy PayoutVault for this token
        vault = new PayoutVault(address(testToken), owner);

        // Mint some tokens to squid router (simulating cross-chain transfer)
        testToken.mint(squidRouter, 1000 ether);
    }

    function testDeposit() public {
        uint256 depositAmount = 100 ether;

        // Simulate Squid router calling deposit
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(commerce, depositAmount, "payout-123");
        vm.stopPrank();

        // Verify balances
        assertEq(vault.getBalance(commerce), depositAmount);
        assertEq(vault.totalDeposits(), depositAmount);
        assertEq(vault.getTotalBalance(), depositAmount);
    }

    function testMultipleDeposits() public {
        uint256 deposit1 = 100 ether;
        uint256 deposit2 = 50 ether;

        // First deposit
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), deposit1);
        vault.deposit(commerce, deposit1, "payout-123");

        // Second deposit
        testToken.approve(address(vault), deposit2);
        vault.deposit(commerce, deposit2, "payout-456");
        vm.stopPrank();

        // Verify cumulative balance
        assertEq(vault.getBalance(commerce), deposit1 + deposit2);
        assertEq(vault.totalDeposits(), deposit1 + deposit2);
    }

    function testCannotDepositZero() public {
        vm.startPrank(squidRouter);
        vm.expectRevert(PayoutVault.ZeroAmount.selector);
        vault.deposit(commerce, 0, "payout-123");
        vm.stopPrank();
    }

    function testDepositEvent() public {
        uint256 depositAmount = 100 ether;
        string memory payoutId = "payout-123";

        vm.startPrank(squidRouter);
        testToken.approve(address(vault), depositAmount);

        // Expect event emission
        vm.expectEmit(true, false, false, true);
        emit PayoutVault.Deposit(commerce, depositAmount, payoutId);

        vault.deposit(commerce, depositAmount, payoutId);
        vm.stopPrank();
    }

    // Tests for withdrawFor() function

    function testWithdrawFor() public {
        uint256 depositAmount = 100 ether;
        address endUser = address(0x5);
        string memory payoutId = "payout-123";

        // Deposit to commerce balance
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(commerce, depositAmount, payoutId);
        vm.stopPrank();

        // Owner (backend) withdraws to end-user (commerce determined from payoutId)
        vm.prank(owner);
        vault.withdrawFor(endUser, depositAmount, payoutId);

        // Verify balances
        assertEq(vault.getBalance(commerce), 0);
        assertEq(vault.totalDeposits(), 0);
        assertEq(testToken.balanceOf(endUser), depositAmount);

        // Verify payout is marked as claimed
        assertTrue(vault.claimedPayouts(payoutId));
    }

    function testWithdrawForPartialAmount() public {
        uint256 depositAmount = 100 ether;
        uint256 withdrawAmount = 30 ether;
        address endUser = address(0x5);
        string memory payoutId = "payout-123";

        // Deposit to commerce balance
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(commerce, depositAmount, payoutId);
        vm.stopPrank();

        // Owner withdraws partial amount
        vm.prank(owner);
        vault.withdrawFor(endUser, withdrawAmount, payoutId);

        // Verify balances
        assertEq(vault.getBalance(commerce), depositAmount - withdrawAmount);
        assertEq(vault.totalDeposits(), depositAmount - withdrawAmount);
        assertEq(testToken.balanceOf(endUser), withdrawAmount);
    }

    function testCannotWithdrawForUnauthorized() public {
        vm.prank(address(0x999));
        vm.expectRevert(PayoutVault.Unauthorized.selector);
        vault.withdrawFor(address(0x5), 100 ether, "payout-123");
    }

    function testCannotWithdrawForZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(PayoutVault.ZeroAmount.selector);
        vault.withdrawFor(address(0x5), 0, "payout-123");
    }

    function testCannotWithdrawForMoreThanBalance() public {
        uint256 depositAmount = 50 ether;
        string memory payoutId = "payout-123";

        // Deposit to commerce balance
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(commerce, depositAmount, payoutId);
        vm.stopPrank();

        // Try to withdraw more than balance
        vm.prank(owner);
        vm.expectRevert(PayoutVault.InsufficientBalance.selector);
        vault.withdrawFor(address(0x5), 100 ether, payoutId);
    }

    function testCannotWithdrawForAlreadyClaimed() public {
        uint256 depositAmount = 100 ether;
        address endUser = address(0x5);
        string memory payoutId = "payout-123";

        // Deposit enough for two withdrawals
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), depositAmount * 2);
        vault.deposit(commerce, depositAmount * 2, payoutId);
        vm.stopPrank();

        // First withdrawal succeeds
        vm.prank(owner);
        vault.withdrawFor(endUser, depositAmount, payoutId);

        // Second withdrawal with same payoutId should fail
        vm.prank(owner);
        vm.expectRevert(PayoutVault.AlreadyClaimed.selector);
        vault.withdrawFor(endUser, depositAmount, payoutId);
    }

    function testWithdrawForEvent() public {
        uint256 depositAmount = 100 ether;
        address endUser = address(0x5);
        string memory payoutId = "payout-123";

        // Deposit to commerce balance
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(commerce, depositAmount, payoutId);
        vm.stopPrank();

        // Expect event emission
        vm.expectEmit(true, true, false, true);
        emit PayoutVault.Withdrawal(commerce, endUser, depositAmount, payoutId);

        vm.prank(owner);
        vault.withdrawFor(endUser, depositAmount, payoutId);
    }

    function testWithdrawForMultipleCommerces() public {
        address commerce2 = address(0x6);
        address endUser1 = address(0x7);
        address endUser2 = address(0x8);
        uint256 amount1 = 100 ether;
        uint256 amount2 = 50 ether;

        // Deposit to two different commerces
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), amount1 + amount2);
        vault.deposit(commerce, amount1, "payout-123");
        vault.deposit(commerce2, amount2, "payout-456");
        vm.stopPrank();

        // Withdraw from first commerce (commerce determined from payoutId)
        vm.prank(owner);
        vault.withdrawFor(endUser1, amount1, "payout-123");

        // Withdraw from second commerce (commerce determined from payoutId)
        vm.prank(owner);
        vault.withdrawFor(endUser2, amount2, "payout-456");

        // Verify balances
        assertEq(vault.getBalance(commerce), 0);
        assertEq(vault.getBalance(commerce2), 0);
        assertEq(testToken.balanceOf(endUser1), amount1);
        assertEq(testToken.balanceOf(endUser2), amount2);
    }

    function testDifferentPayoutsSameCommerce() public {
        address endUser1 = address(0x7);
        address endUser2 = address(0x8);
        uint256 amount1 = 100 ether;
        uint256 amount2 = 50 ether;

        // Deposit two different payouts to same commerce
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), amount1 + amount2);
        vault.deposit(commerce, amount1, "payout-123");
        vault.deposit(commerce, amount2, "payout-456");
        vm.stopPrank();

        // Withdraw both payouts (commerce determined from each payoutId)
        vm.startPrank(owner);
        vault.withdrawFor(endUser1, amount1, "payout-123");
        vault.withdrawFor(endUser2, amount2, "payout-456");
        vm.stopPrank();

        // Verify both payouts are claimed
        assertTrue(vault.claimedPayouts("payout-123"));
        assertTrue(vault.claimedPayouts("payout-456"));
        assertEq(testToken.balanceOf(endUser1), amount1);
        assertEq(testToken.balanceOf(endUser2), amount2);
    }

    // Security tests for payoutId-commerce binding

    function testCannotWithdrawInvalidPayoutId() public {
        address endUser = address(0xa);
        uint256 amount = 100 ether;

        // Try to withdraw with non-existent payoutId
        vm.prank(owner);
        vm.expectRevert(PayoutVault.InvalidCommerce.selector);
        vault.withdrawFor(endUser, amount, "non-existent-payout");
    }

    function testCannotDepositDuplicatePayoutId() public {
        uint256 amount = 100 ether;

        // First deposit
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), amount * 2);
        vault.deposit(commerce, amount, "payout-123");

        // Try to deposit with same payoutId (even to same commerce)
        vm.expectRevert(PayoutVault.PayoutAlreadyExists.selector);
        vault.deposit(commerce, amount, "payout-123");
        vm.stopPrank();
    }

    function testCannotDepositSamePayoutIdDifferentCommerce() public {
        address commerce2 = address(0x9);
        uint256 amount = 100 ether;

        // Commerce A deposits
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), amount * 2);
        vault.deposit(commerce, amount, "payout-123");

        // Commerce B tries to use same payoutId (ATTACK!)
        vm.expectRevert(PayoutVault.PayoutAlreadyExists.selector);
        vault.deposit(commerce2, amount, "payout-123");
        vm.stopPrank();
    }

    function testPayoutToCommerceMapping() public {
        string memory payoutId = "payout-123";
        uint256 amount = 100 ether;

        // Before deposit, mapping should be empty
        assertEq(vault.payoutToCommerce(payoutId), address(0));

        // Deposit
        vm.startPrank(squidRouter);
        testToken.approve(address(vault), amount);
        vault.deposit(commerce, amount, payoutId);
        vm.stopPrank();

        // After deposit, mapping should link to commerce
        assertEq(vault.payoutToCommerce(payoutId), commerce);
    }
}
