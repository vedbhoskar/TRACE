// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract ProofRegistry {
  enum Category {
    Food,
    Medical,
    Logistics
  }

  enum ReviewStatus {
    Unreviewed,
    Attested,
    Flagged
  }

  enum ReasonCode {
    None,
    DocumentReviewed,
    InsufficientEvidence,
    AmountDiscrepancy,
    Other
  }

  struct Donation {
    bool exists;
    uint256 amountPaise;
    uint256 allocatedPaise;
    address submitter;
    uint64 recordedAt;
  }

  struct Allocation {
    bool exists;
    bytes32 donationId;
    uint256 amountPaise;
    uint256 claimedPaise;
    Category category;
    address submitter;
    uint64 recordedAt;
  }

  struct Expense {
    bool exists;
    bytes32 allocationId;
    uint256 amountPaise;
    bytes32 receiptHash;
    address submitter;
    uint64 submittedAt;
    ReviewStatus latestReviewStatus;
    ReasonCode latestReviewReason;
    address latestReviewer;
    uint64 latestReviewedAt;
    uint256 reviewCount;
  }

  struct ReviewRecord {
    ReviewStatus decision;
    ReasonCode reason;
    address reviewer;
    uint64 reviewedAt;
  }

  error UnauthorizedNgo(address caller);
  error UnauthorizedAuditor(address caller);
  error ZeroCampaignId();
  error ZeroAddress();
  error RolesMustDiffer();
  error EmptyId();
  error ZeroAmount();
  error EmptyReceiptHash();
  error DuplicateDonation(bytes32 donationId);
  error DuplicateAllocation(bytes32 allocationId);
  error DuplicateExpense(bytes32 expenseId);
  error DonationNotFound(bytes32 donationId);
  error AllocationNotFound(bytes32 allocationId);
  error ExpenseNotFound(bytes32 expenseId);
  error AllocationLimitExceeded(bytes32 donationId, uint256 availablePaise, uint256 requestedPaise);
  error ExpenseLimitExceeded(bytes32 allocationId, uint256 availablePaise, uint256 requestedPaise);
  error InvalidReviewStatus(ReviewStatus decision);
  error InvalidReviewReason(ReasonCode reason);
  error DuplicateReview(ReviewStatus decision, ReasonCode reason);

  event DonationRecorded(
    bytes32 indexed donationId,
    uint256 amountPaise,
    address indexed submitter,
    uint64 recordedAt
  );

  event AllocationRecorded(
    bytes32 indexed allocationId,
    bytes32 indexed donationId,
    uint256 amountPaise,
    Category category,
    address indexed submitter,
    uint64 recordedAt
  );

  event ExpenseSubmitted(
    bytes32 indexed expenseId,
    bytes32 indexed allocationId,
    uint256 amountPaise,
    bytes32 receiptHash,
    address indexed submitter,
    uint64 submittedAt
  );

  event ExpenseReviewed(
    bytes32 indexed expenseId,
    ReviewStatus decision,
    ReasonCode reason,
    address indexed reviewer,
    uint64 reviewedAt,
    uint256 reviewNumber
  );

  bytes32 public immutable campaignId;
  address public immutable ngo;
  address public immutable auditor;

  uint256 public donationCount;
  uint256 public allocationCount;
  uint256 public expenseCount;
  uint256 public reviewEventCount;
  uint256 public totalRecordedDonationsPaise;
  uint256 public totalAllocatedPaise;
  uint256 public totalExpenseClaimsPaise;

  mapping(bytes32 donationId => Donation) private donations;
  mapping(bytes32 allocationId => Allocation) private allocations;
  mapping(bytes32 expenseId => Expense) private expenses;
  mapping(bytes32 expenseId => ReviewRecord[]) private reviewHistory;

  modifier onlyNgo() {
    if (msg.sender != ngo) {
      revert UnauthorizedNgo(msg.sender);
    }
    _;
  }

  modifier onlyAuditor() {
    if (msg.sender != auditor) {
      revert UnauthorizedAuditor(msg.sender);
    }
    _;
  }

  constructor(bytes32 campaignId_, address ngo_, address auditor_) {
    if (campaignId_ == bytes32(0)) {
      revert ZeroCampaignId();
    }
    if (ngo_ == address(0) || auditor_ == address(0)) {
      revert ZeroAddress();
    }
    if (ngo_ == auditor_) {
      revert RolesMustDiffer();
    }

    campaignId = campaignId_;
    ngo = ngo_;
    auditor = auditor_;
  }

  function recordDonation(bytes32 donationId, uint256 amountPaise) external onlyNgo {
    _requireId(donationId);
    if (donations[donationId].exists) {
      revert DuplicateDonation(donationId);
    }
    _requirePositiveAmount(amountPaise);

    uint64 recordedAt = uint64(block.timestamp);
    donations[donationId] = Donation({
      exists: true,
      amountPaise: amountPaise,
      allocatedPaise: 0,
      submitter: msg.sender,
      recordedAt: recordedAt
    });

    donationCount += 1;
    totalRecordedDonationsPaise += amountPaise;

    emit DonationRecorded(donationId, amountPaise, msg.sender, recordedAt);
  }

  function recordAllocation(
    bytes32 allocationId,
    bytes32 donationId,
    uint256 amountPaise,
    Category category
  ) external onlyNgo {
    _requireId(allocationId);
    _requireId(donationId);
    if (allocations[allocationId].exists) {
      revert DuplicateAllocation(allocationId);
    }
    _requirePositiveAmount(amountPaise);

    Donation storage donation = donations[donationId];
    if (!donation.exists) {
      revert DonationNotFound(donationId);
    }

    uint256 availablePaise = donation.amountPaise - donation.allocatedPaise;
    if (amountPaise > availablePaise) {
      revert AllocationLimitExceeded(donationId, availablePaise, amountPaise);
    }

    uint64 recordedAt = uint64(block.timestamp);
    allocations[allocationId] = Allocation({
      exists: true,
      donationId: donationId,
      amountPaise: amountPaise,
      claimedPaise: 0,
      category: category,
      submitter: msg.sender,
      recordedAt: recordedAt
    });
    donation.allocatedPaise += amountPaise;

    allocationCount += 1;
    totalAllocatedPaise += amountPaise;

    emit AllocationRecorded(
      allocationId,
      donationId,
      amountPaise,
      category,
      msg.sender,
      recordedAt
    );
  }

  function submitExpense(
    bytes32 expenseId,
    bytes32 allocationId,
    uint256 amountPaise,
    bytes32 receiptHash
  ) external onlyNgo {
    _requireId(expenseId);
    _requireId(allocationId);
    if (expenses[expenseId].exists) {
      revert DuplicateExpense(expenseId);
    }
    _requirePositiveAmount(amountPaise);
    if (receiptHash == bytes32(0)) {
      revert EmptyReceiptHash();
    }

    Allocation storage allocation = allocations[allocationId];
    if (!allocation.exists) {
      revert AllocationNotFound(allocationId);
    }

    uint256 availablePaise = allocation.amountPaise - allocation.claimedPaise;
    if (amountPaise > availablePaise) {
      revert ExpenseLimitExceeded(allocationId, availablePaise, amountPaise);
    }

    uint64 submittedAt = uint64(block.timestamp);
    expenses[expenseId] = Expense({
      exists: true,
      allocationId: allocationId,
      amountPaise: amountPaise,
      receiptHash: receiptHash,
      submitter: msg.sender,
      submittedAt: submittedAt,
      latestReviewStatus: ReviewStatus.Unreviewed,
      latestReviewReason: ReasonCode.None,
      latestReviewer: address(0),
      latestReviewedAt: 0,
      reviewCount: 0
    });
    allocation.claimedPaise += amountPaise;

    expenseCount += 1;
    totalExpenseClaimsPaise += amountPaise;

    emit ExpenseSubmitted(
      expenseId,
      allocationId,
      amountPaise,
      receiptHash,
      msg.sender,
      submittedAt
    );
  }

  function reviewExpense(
    bytes32 expenseId,
    ReviewStatus decision,
    ReasonCode reason
  ) external onlyAuditor {
    _requireId(expenseId);

    Expense storage expense = expenses[expenseId];
    if (!expense.exists) {
      revert ExpenseNotFound(expenseId);
    }
    if (decision == ReviewStatus.Unreviewed) {
      revert InvalidReviewStatus(decision);
    }
    if (reason == ReasonCode.None) {
      revert InvalidReviewReason(reason);
    }
    if (expense.reviewCount > 0 && expense.latestReviewStatus == decision && expense.latestReviewReason == reason) {
      revert DuplicateReview(decision, reason);
    }

    uint64 reviewedAt = uint64(block.timestamp);
    uint256 reviewNumber = expense.reviewCount + 1;

    expense.latestReviewStatus = decision;
    expense.latestReviewReason = reason;
    expense.latestReviewer = msg.sender;
    expense.latestReviewedAt = reviewedAt;
    expense.reviewCount = reviewNumber;

    reviewHistory[expenseId].push(ReviewRecord({
      decision: decision,
      reason: reason,
      reviewer: msg.sender,
      reviewedAt: reviewedAt
    }));
    reviewEventCount += 1;

    emit ExpenseReviewed(
      expenseId,
      decision,
      reason,
      msg.sender,
      reviewedAt,
      reviewNumber
    );
  }

  function getDonation(bytes32 donationId) external view returns (Donation memory) {
    Donation memory donation = donations[donationId];
    if (!donation.exists) {
      revert DonationNotFound(donationId);
    }
    return donation;
  }

  function getAllocation(bytes32 allocationId) external view returns (Allocation memory) {
    Allocation memory allocation = allocations[allocationId];
    if (!allocation.exists) {
      revert AllocationNotFound(allocationId);
    }
    return allocation;
  }

  function getExpense(bytes32 expenseId) external view returns (Expense memory) {
    Expense memory expense = expenses[expenseId];
    if (!expense.exists) {
      revert ExpenseNotFound(expenseId);
    }
    return expense;
  }

  function getReviewHistory(bytes32 expenseId) external view returns (ReviewRecord[] memory) {
    if (!expenses[expenseId].exists) {
      revert ExpenseNotFound(expenseId);
    }
    return reviewHistory[expenseId];
  }

  function _requireId(bytes32 id) private pure {
    if (id == bytes32(0)) {
      revert EmptyId();
    }
  }

  function _requirePositiveAmount(uint256 amountPaise) private pure {
    if (amountPaise == 0) {
      revert ZeroAmount();
    }
  }
}
