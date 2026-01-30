// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract DealPactEscrow is ReentrancyGuard, Pausable {
    // USDC on Base mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    // USDC on Base Sepolia (testnet): 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    IERC20 public immutable usdc;

    address public owner;
    uint256 public feePercent = 150; // 1.5% = 150 basis points
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public maxEscrowAmount = 500 * 10**6; // 500 USDC (6 decimals)

    uint256 public dealCounter;

    enum DealStatus {
        Pending,    // Created, waiting for deposit
        Funded,     // Buyer deposited USDC
        Completed,  // Funds released to seller
        Refunded,   // Funds returned to buyer
        Disputed,   // Under dispute
        Cancelled   // Cancelled before funding
    }

    struct Deal {
        string externalId;      // DP-XXXX from bot
        address seller;
        address buyer;
        uint256 amount;
        DealStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }

    mapping(uint256 => Deal) public deals;
    mapping(string => uint256) public externalIdToDealId;

    // Reputation tracking
    mapping(address => uint256) public completedDeals;
    mapping(address => uint256) public totalVolume;

    // Events
    event DealCreated(uint256 indexed dealId, string externalId, address seller, address buyer, uint256 amount);
    event DealFunded(uint256 indexed dealId, address buyer, uint256 amount);
    event DealCompleted(uint256 indexed dealId, address seller, uint256 amount, uint256 fee);
    event DealRefunded(uint256 indexed dealId, address buyer, uint256 amount);
    event DealDisputed(uint256 indexed dealId, address disputedBy);
    event DealCancelled(uint256 indexed dealId);
    event FeePercentChanged(uint256 oldFee, uint256 newFee);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _usdcAddress) {
        usdc = IERC20(_usdcAddress);
        owner = msg.sender;
    }

    // Create a new escrow deal
    function createDeal(
        string calldata _externalId,
        address _seller,
        address _buyer,
        uint256 _amount
    ) external whenNotPaused returns (uint256) {
        require(_seller != address(0), "Invalid seller");
        require(_buyer != address(0), "Invalid buyer");
        require(_seller != _buyer, "Seller cannot be buyer");
        require(_amount > 0 && _amount <= maxEscrowAmount, "Invalid amount");
        require(externalIdToDealId[_externalId] == 0, "External ID exists");

        dealCounter++;
        uint256 dealId = dealCounter;

        deals[dealId] = Deal({
            externalId: _externalId,
            seller: _seller,
            buyer: _buyer,
            amount: _amount,
            status: DealStatus.Pending,
            createdAt: block.timestamp,
            completedAt: 0
        });

        externalIdToDealId[_externalId] = dealId;

        emit DealCreated(dealId, _externalId, _seller, _buyer, _amount);
        return dealId;
    }

    // Buyer deposits USDC to fund the deal
    function deposit(uint256 _dealId) external nonReentrant whenNotPaused {
        Deal storage deal = deals[_dealId];
        require(deal.buyer != address(0), "Deal not found");
        require(msg.sender == deal.buyer, "Only buyer can deposit");
        require(deal.status == DealStatus.Pending, "Deal not pending");

        deal.status = DealStatus.Funded;

        require(
            usdc.transferFrom(msg.sender, address(this), deal.amount),
            "Transfer failed"
        );

        emit DealFunded(_dealId, msg.sender, deal.amount);
    }

    // Buyer releases funds to seller
    function release(uint256 _dealId) external nonReentrant {
        Deal storage deal = deals[_dealId];
        require(msg.sender == deal.buyer, "Only buyer can release");
        require(deal.status == DealStatus.Funded, "Deal not funded");

        deal.status = DealStatus.Completed;
        deal.completedAt = block.timestamp;

        // Calculate fee
        uint256 fee = (deal.amount * feePercent) / BASIS_POINTS;
        uint256 sellerAmount = deal.amount - fee;

        // Update reputation
        completedDeals[deal.seller]++;
        completedDeals[deal.buyer]++;
        totalVolume[deal.seller] += deal.amount;
        totalVolume[deal.buyer] += deal.amount;

        // Transfer to seller
        require(usdc.transfer(deal.seller, sellerAmount), "Seller transfer failed");

        // Transfer fee to owner
        if (fee > 0) {
            require(usdc.transfer(owner, fee), "Fee transfer failed");
        }

        emit DealCompleted(_dealId, deal.seller, sellerAmount, fee);
    }

    // Owner refunds buyer (for disputes)
    function refund(uint256 _dealId) external onlyOwner nonReentrant {
        Deal storage deal = deals[_dealId];
        require(
            deal.status == DealStatus.Funded || deal.status == DealStatus.Disputed,
            "Cannot refund"
        );

        deal.status = DealStatus.Refunded;
        deal.completedAt = block.timestamp;

        require(usdc.transfer(deal.buyer, deal.amount), "Refund failed");

        emit DealRefunded(_dealId, deal.buyer, deal.amount);
    }

    // Either party can flag dispute
    function dispute(uint256 _dealId) external {
        Deal storage deal = deals[_dealId];
        require(
            msg.sender == deal.buyer || msg.sender == deal.seller,
            "Not a party"
        );
        require(deal.status == DealStatus.Funded, "Deal not funded");

        deal.status = DealStatus.Disputed;

        emit DealDisputed(_dealId, msg.sender);
    }

    // Cancel unfunded deal
    function cancel(uint256 _dealId) external {
        Deal storage deal = deals[_dealId];
        require(
            msg.sender == deal.seller || msg.sender == owner,
            "Not authorized"
        );
        require(deal.status == DealStatus.Pending, "Cannot cancel");

        deal.status = DealStatus.Cancelled;

        emit DealCancelled(_dealId);
    }

    // Owner resolves dispute by releasing to seller
    function resolveRelease(uint256 _dealId) external onlyOwner nonReentrant {
        Deal storage deal = deals[_dealId];
        require(deal.status == DealStatus.Disputed, "Not disputed");

        deal.status = DealStatus.Completed;
        deal.completedAt = block.timestamp;

        uint256 fee = (deal.amount * feePercent) / BASIS_POINTS;
        uint256 sellerAmount = deal.amount - fee;

        completedDeals[deal.seller]++;
        completedDeals[deal.buyer]++;
        totalVolume[deal.seller] += deal.amount;
        totalVolume[deal.buyer] += deal.amount;

        require(usdc.transfer(deal.seller, sellerAmount), "Transfer failed");
        if (fee > 0) {
            require(usdc.transfer(owner, fee), "Fee transfer failed");
        }

        emit DealCompleted(_dealId, deal.seller, sellerAmount, fee);
    }

    // View functions
    function getDeal(uint256 _dealId) external view returns (Deal memory) {
        return deals[_dealId];
    }

    function getDealByExternalId(string calldata _externalId) external view returns (Deal memory) {
        uint256 dealId = externalIdToDealId[_externalId];
        require(dealId != 0, "Deal not found");
        return deals[dealId];
    }

    function getReputation(address _user) external view returns (uint256 completed, uint256 volume) {
        return (completedDeals[_user], totalVolume[_user]);
    }

    // Owner functions
    function setFeePercent(uint256 _newFee) external onlyOwner {
        require(_newFee <= 500, "Fee too high"); // Max 5%
        uint256 oldFee = feePercent;
        feePercent = _newFee;
        emit FeePercentChanged(oldFee, _newFee);
    }

    function setMaxEscrowAmount(uint256 _newMax) external onlyOwner {
        maxEscrowAmount = _newMax;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
