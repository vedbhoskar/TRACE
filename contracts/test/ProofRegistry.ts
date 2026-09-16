import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";
import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

const Category = {
  Food: 0,
  Medical: 1,
  Logistics: 2,
} as const;

const ReviewStatus = {
  Unreviewed: 0,
  Attested: 1,
  Flagged: 2,
} as const;

const ReasonCode = {
  None: 0,
  DocumentReviewed: 1,
  InsufficientEvidence: 2,
  AmountDiscrepancy: 3,
  Other: 4,
} as const;

const ids = {
  campaign: ethers.encodeBytes32String("CAM-FLOOD-01"),
  donation: ethers.encodeBytes32String("DON-8F42A1"),
  allocation: ethers.encodeBytes32String("AL-FOOD-01"),
  secondAllocation: ethers.encodeBytes32String("AL-MED-01"),
  expense: ethers.encodeBytes32String("EX-FOOD-01"),
  secondExpense: ethers.encodeBytes32String("EX-FOOD-02"),
};

const receiptHash = ethers.sha256(
  ethers.toUtf8Bytes("frozen synthetic receipt bytes"),
);

async function deployRegistryFixture() {
  const [deployer, ngo, auditor, outsider] = await ethers.getSigners();
  const registry = await ethers.deployContract(
    "ProofRegistry",
    [ids.campaign, ngo.address, auditor.address],
    deployer,
  );

  return { registry, deployer, ngo, auditor, outsider };
}

async function donationFixture() {
  const context = await deployRegistryFixture();
  await context.registry.connect(context.ngo).recordDonation(ids.donation, 1_000_000n);
  return context;
}

async function allocationFixture() {
  const context = await donationFixture();
  await context.registry
    .connect(context.ngo)
    .recordAllocation(ids.allocation, ids.donation, 600_000n, Category.Food);
  return context;
}

async function expenseFixture() {
  const context = await allocationFixture();
  await context.registry
    .connect(context.ngo)
    .submitExpense(ids.expense, ids.allocation, 480_000n, receiptHash);
  return context;
}

describe("ProofRegistry", function () {
  describe("deployment and immutable roles", function () {
    it("stores the campaign and two distinct role addresses", async function () {
      const { registry, ngo, auditor } = await networkHelpers.loadFixture(
        deployRegistryFixture,
      );

      expect(await registry.campaignId()).to.equal(ids.campaign);
      expect(await registry.ngo()).to.equal(ngo.address);
      expect(await registry.auditor()).to.equal(auditor.address);
    });

    it("rejects an empty campaign ID", async function () {
      const [, ngo, auditor] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("ProofRegistry");

      await expect(
        factory.deploy(ethers.ZeroHash, ngo.address, auditor.address),
      ).to.be.revertedWithCustomError(factory, "ZeroCampaignId");
    });

    it("rejects zero role addresses", async function () {
      const [, ngo, auditor] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("ProofRegistry");

      await expect(
        factory.deploy(ids.campaign, ethers.ZeroAddress, auditor.address),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
      await expect(
        factory.deploy(ids.campaign, ngo.address, ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("rejects the same address for NGO and auditor", async function () {
      const [, ngo] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("ProofRegistry");

      await expect(
        factory.deploy(ids.campaign, ngo.address, ngo.address),
      ).to.be.revertedWithCustomError(factory, "RolesMustDiffer");
    });
  });

  describe("complete trace", function () {
    it("records donation, allocation, expense, and review with reconstructable events", async function () {
      const { registry, ngo, auditor } = await networkHelpers.loadFixture(
        deployRegistryFixture,
      );

      await expect(
        registry.connect(ngo).recordDonation(ids.donation, 1_000_000n),
      )
        .to.emit(registry, "DonationRecorded")
        .withArgs(ids.donation, 1_000_000n, ngo.address, anyValue);

      await expect(
        registry
          .connect(ngo)
          .recordAllocation(
            ids.allocation,
            ids.donation,
            600_000n,
            Category.Food,
          ),
      )
        .to.emit(registry, "AllocationRecorded")
        .withArgs(
          ids.allocation,
          ids.donation,
          600_000n,
          Category.Food,
          ngo.address,
          anyValue,
        );

      await expect(
        registry
          .connect(ngo)
          .submitExpense(ids.expense, ids.allocation, 480_000n, receiptHash),
      )
        .to.emit(registry, "ExpenseSubmitted")
        .withArgs(
          ids.expense,
          ids.allocation,
          480_000n,
          receiptHash,
          ngo.address,
          anyValue,
        );

      await expect(
        registry
          .connect(auditor)
          .reviewExpense(
            ids.expense,
            ReviewStatus.Attested,
            ReasonCode.DocumentReviewed,
          ),
      )
        .to.emit(registry, "ExpenseReviewed")
        .withArgs(
          ids.expense,
          ReviewStatus.Attested,
          ReasonCode.DocumentReviewed,
          auditor.address,
          anyValue,
          1n,
        );

      const donation = await registry.getDonation(ids.donation);
      const allocation = await registry.getAllocation(ids.allocation);
      const expense = await registry.getExpense(ids.expense);
      const history = await registry.getReviewHistory(ids.expense);

      expect(donation.amountPaise).to.equal(1_000_000n);
      expect(donation.allocatedPaise).to.equal(600_000n);
      expect(allocation.donationId).to.equal(ids.donation);
      expect(allocation.claimedPaise).to.equal(480_000n);
      expect(expense.receiptHash).to.equal(receiptHash);
      expect(expense.latestReviewStatus).to.equal(ReviewStatus.Attested);
      expect(expense.latestReviewReason).to.equal(ReasonCode.DocumentReviewed);
      expect(expense.latestReviewer).to.equal(auditor.address);
      expect(expense.reviewCount).to.equal(1n);
      expect(history).to.have.length(1);
      expect(history[0].decision).to.equal(ReviewStatus.Attested);

      expect(await registry.donationCount()).to.equal(1n);
      expect(await registry.allocationCount()).to.equal(1n);
      expect(await registry.expenseCount()).to.equal(1n);
      expect(await registry.reviewEventCount()).to.equal(1n);
      expect(await registry.totalRecordedDonationsPaise()).to.equal(1_000_000n);
      expect(await registry.totalAllocatedPaise()).to.equal(600_000n);
      expect(await registry.totalExpenseClaimsPaise()).to.equal(480_000n);
    });
  });

  describe("authorization", function () {
    it("rejects every NGO write from another account", async function () {
      const { registry, outsider } = await networkHelpers.loadFixture(
        deployRegistryFixture,
      );

      await expect(
        registry.connect(outsider).recordDonation(ids.donation, 1n),
      )
        .to.be.revertedWithCustomError(registry, "UnauthorizedNgo")
        .withArgs(outsider.address);
      await expect(
        registry
          .connect(outsider)
          .recordAllocation(ids.allocation, ids.donation, 1n, Category.Food),
      )
        .to.be.revertedWithCustomError(registry, "UnauthorizedNgo")
        .withArgs(outsider.address);
      await expect(
        registry
          .connect(outsider)
          .submitExpense(ids.expense, ids.allocation, 1n, receiptHash),
      )
        .to.be.revertedWithCustomError(registry, "UnauthorizedNgo")
        .withArgs(outsider.address);

      expect(await registry.donationCount()).to.equal(0n);
      expect(await registry.allocationCount()).to.equal(0n);
      expect(await registry.expenseCount()).to.equal(0n);
    });

    it("rejects review attempts from NGO and unrelated accounts", async function () {
      const { registry, ngo, outsider } = await networkHelpers.loadFixture(
        expenseFixture,
      );

      for (const signer of [ngo, outsider]) {
        await expect(
          registry
            .connect(signer)
            .reviewExpense(
              ids.expense,
              ReviewStatus.Attested,
              ReasonCode.DocumentReviewed,
            ),
        )
          .to.be.revertedWithCustomError(registry, "UnauthorizedAuditor")
          .withArgs(signer.address);
      }

      expect(await registry.reviewEventCount()).to.equal(0n);
    });
  });

  describe("donations", function () {
    it("rejects an empty ID and zero amount", async function () {
      const { registry, ngo } = await networkHelpers.loadFixture(
        deployRegistryFixture,
      );

      await expect(
        registry.connect(ngo).recordDonation(ethers.ZeroHash, 1n),
      ).to.be.revertedWithCustomError(registry, "EmptyId");
      await expect(
        registry.connect(ngo).recordDonation(ids.donation, 0n),
      ).to.be.revertedWithCustomError(registry, "ZeroAmount");
    });

    it("rejects duplicate IDs without changing totals", async function () {
      const { registry, ngo } = await networkHelpers.loadFixture(donationFixture);

      await expect(
        registry.connect(ngo).recordDonation(ids.donation, 20n),
      )
        .to.be.revertedWithCustomError(registry, "DuplicateDonation")
        .withArgs(ids.donation);

      expect(await registry.donationCount()).to.equal(1n);
      expect(await registry.totalRecordedDonationsPaise()).to.equal(1_000_000n);
    });
  });

  describe("allocations", function () {
    it("rejects empty IDs, zero amounts, and missing donations", async function () {
      const { registry, ngo } = await networkHelpers.loadFixture(donationFixture);
      const missingDonation = ethers.encodeBytes32String("DON-MISSING");

      await expect(
        registry
          .connect(ngo)
          .recordAllocation(ethers.ZeroHash, ids.donation, 1n, Category.Food),
      ).to.be.revertedWithCustomError(registry, "EmptyId");
      await expect(
        registry
          .connect(ngo)
          .recordAllocation(ids.allocation, ethers.ZeroHash, 1n, Category.Food),
      ).to.be.revertedWithCustomError(registry, "EmptyId");
      await expect(
        registry
          .connect(ngo)
          .recordAllocation(ids.allocation, ids.donation, 0n, Category.Food),
      ).to.be.revertedWithCustomError(registry, "ZeroAmount");
      await expect(
        registry
          .connect(ngo)
          .recordAllocation(ids.allocation, missingDonation, 1n, Category.Food),
      )
        .to.be.revertedWithCustomError(registry, "DonationNotFound")
        .withArgs(missingDonation);
    });

    it("rejects duplicate IDs", async function () {
      const { registry, ngo } = await networkHelpers.loadFixture(allocationFixture);

      await expect(
        registry
          .connect(ngo)
          .recordAllocation(
            ids.allocation,
            ids.donation,
            1n,
            Category.Medical,
          ),
      )
        .to.be.revertedWithCustomError(registry, "DuplicateAllocation")
        .withArgs(ids.allocation);
    });

    it("accepts the exact donation limit and rejects one paise over", async function () {
      const { registry, ngo } = await networkHelpers.loadFixture(donationFixture);

      await registry
        .connect(ngo)
        .recordAllocation(
          ids.allocation,
          ids.donation,
          1_000_000n,
          Category.Food,
        );

      await expect(
        registry
          .connect(ngo)
          .recordAllocation(
            ids.secondAllocation,
            ids.donation,
            1n,
            Category.Medical,
          ),
      )
        .to.be.revertedWithCustomError(registry, "AllocationLimitExceeded")
        .withArgs(ids.donation, 0n, 1n);

      const donation = await registry.getDonation(ids.donation);
      expect(donation.allocatedPaise).to.equal(1_000_000n);
      expect(await registry.allocationCount()).to.equal(1n);
      expect(await registry.totalAllocatedPaise()).to.equal(1_000_000n);
    });

    it("reports the exact available amount when an allocation exceeds capacity", async function () {
      const { registry, ngo } = await networkHelpers.loadFixture(allocationFixture);

      await expect(
        registry
          .connect(ngo)
          .recordAllocation(
            ids.secondAllocation,
            ids.donation,
            400_001n,
            Category.Medical,
          ),
      )
        .to.be.revertedWithCustomError(registry, "AllocationLimitExceeded")
        .withArgs(ids.donation, 400_000n, 400_001n);
    });
  });

  describe("expenses", function () {
    it("rejects empty IDs, zero amounts, empty digests, and missing allocations", async function () {
      const { registry, ngo } = await networkHelpers.loadFixture(allocationFixture);
      const missingAllocation = ethers.encodeBytes32String("AL-MISSING");

      await expect(
        registry
          .connect(ngo)
          .submitExpense(ethers.ZeroHash, ids.allocation, 1n, receiptHash),
      ).to.be.revertedWithCustomError(registry, "EmptyId");
      await expect(
        registry
          .connect(ngo)
          .submitExpense(ids.expense, ethers.ZeroHash, 1n, receiptHash),
      ).to.be.revertedWithCustomError(registry, "EmptyId");
      await expect(
        registry
          .connect(ngo)
          .submitExpense(ids.expense, ids.allocation, 0n, receiptHash),
      ).to.be.revertedWithCustomError(registry, "ZeroAmount");
      await expect(
        registry
          .connect(ngo)
          .submitExpense(ids.expense, ids.allocation, 1n, ethers.ZeroHash),
      ).to.be.revertedWithCustomError(registry, "EmptyReceiptHash");
      await expect(
        registry
          .connect(ngo)
          .submitExpense(ids.expense, missingAllocation, 1n, receiptHash),
      )
        .to.be.revertedWithCustomError(registry, "AllocationNotFound")
        .withArgs(missingAllocation);
    });

    it("rejects duplicate IDs", async function () {
      const { registry, ngo } = await networkHelpers.loadFixture(expenseFixture);

      await expect(
        registry
          .connect(ngo)
          .submitExpense(ids.expense, ids.allocation, 1n, receiptHash),
      )
        .to.be.revertedWithCustomError(registry, "DuplicateExpense")
        .withArgs(ids.expense);
    });

    it("accepts the exact allocation limit and rejects one paise over", async function () {
      const { registry, ngo } = await networkHelpers.loadFixture(allocationFixture);

      await registry
        .connect(ngo)
        .submitExpense(ids.expense, ids.allocation, 600_000n, receiptHash);

      await expect(
        registry
          .connect(ngo)
          .submitExpense(ids.secondExpense, ids.allocation, 1n, receiptHash),
      )
        .to.be.revertedWithCustomError(registry, "ExpenseLimitExceeded")
        .withArgs(ids.allocation, 0n, 1n);

      const allocation = await registry.getAllocation(ids.allocation);
      expect(allocation.claimedPaise).to.equal(600_000n);
      expect(await registry.expenseCount()).to.equal(1n);
      expect(await registry.totalExpenseClaimsPaise()).to.equal(600_000n);
    });

    it("reports remaining capacity and leaves totals unchanged after overflow", async function () {
      const { registry, ngo } = await networkHelpers.loadFixture(expenseFixture);

      await expect(
        registry
          .connect(ngo)
          .submitExpense(
            ids.secondExpense,
            ids.allocation,
            120_001n,
            receiptHash,
          ),
      )
        .to.be.revertedWithCustomError(registry, "ExpenseLimitExceeded")
        .withArgs(ids.allocation, 120_000n, 120_001n);

      const allocation = await registry.getAllocation(ids.allocation);
      expect(allocation.claimedPaise).to.equal(480_000n);
      expect(await registry.expenseCount()).to.equal(1n);
      expect(await registry.totalExpenseClaimsPaise()).to.equal(480_000n);
    });
  });

  describe("review history", function () {
    it("rejects empty and unknown expense IDs", async function () {
      const { registry, auditor } = await networkHelpers.loadFixture(expenseFixture);
      const missingExpense = ethers.encodeBytes32String("EX-MISSING");

      await expect(
        registry
          .connect(auditor)
          .reviewExpense(
            ethers.ZeroHash,
            ReviewStatus.Attested,
            ReasonCode.DocumentReviewed,
          ),
      ).to.be.revertedWithCustomError(registry, "EmptyId");
      await expect(
        registry
          .connect(auditor)
          .reviewExpense(
            missingExpense,
            ReviewStatus.Attested,
            ReasonCode.DocumentReviewed,
          ),
      )
        .to.be.revertedWithCustomError(registry, "ExpenseNotFound")
        .withArgs(missingExpense);
    });

    it("rejects Unreviewed decisions and empty reasons", async function () {
      const { registry, auditor } = await networkHelpers.loadFixture(expenseFixture);

      await expect(
        registry
          .connect(auditor)
          .reviewExpense(
            ids.expense,
            ReviewStatus.Unreviewed,
            ReasonCode.DocumentReviewed,
          ),
      )
        .to.be.revertedWithCustomError(registry, "InvalidReviewStatus")
        .withArgs(ReviewStatus.Unreviewed);
      await expect(
        registry
          .connect(auditor)
          .reviewExpense(
            ids.expense,
            ReviewStatus.Attested,
            ReasonCode.None,
          ),
      )
        .to.be.revertedWithCustomError(registry, "InvalidReviewReason")
        .withArgs(ReasonCode.None);
    });

    it("rejects an identical repeated decision without adding history", async function () {
      const { registry, auditor } = await networkHelpers.loadFixture(expenseFixture);

      await registry
        .connect(auditor)
        .reviewExpense(
          ids.expense,
          ReviewStatus.Flagged,
          ReasonCode.InsufficientEvidence,
        );

      await expect(
        registry
          .connect(auditor)
          .reviewExpense(
            ids.expense,
            ReviewStatus.Flagged,
            ReasonCode.InsufficientEvidence,
          ),
      )
        .to.be.revertedWithCustomError(registry, "DuplicateReview")
        .withArgs(ReviewStatus.Flagged, ReasonCode.InsufficientEvidence);

      expect(await registry.reviewEventCount()).to.equal(1n);
      expect(await registry.getReviewHistory(ids.expense)).to.have.length(1);
    });

    it("updates latest state while preserving every previous decision", async function () {
      const { registry, auditor } = await networkHelpers.loadFixture(expenseFixture);

      await registry
        .connect(auditor)
        .reviewExpense(
          ids.expense,
          ReviewStatus.Flagged,
          ReasonCode.AmountDiscrepancy,
        );
      await registry
        .connect(auditor)
        .reviewExpense(
          ids.expense,
          ReviewStatus.Attested,
          ReasonCode.DocumentReviewed,
        );

      const expense = await registry.getExpense(ids.expense);
      const history = await registry.getReviewHistory(ids.expense);

      expect(expense.latestReviewStatus).to.equal(ReviewStatus.Attested);
      expect(expense.latestReviewReason).to.equal(ReasonCode.DocumentReviewed);
      expect(expense.reviewCount).to.equal(2n);
      expect(history).to.have.length(2);
      expect(history[0].decision).to.equal(ReviewStatus.Flagged);
      expect(history[0].reason).to.equal(ReasonCode.AmountDiscrepancy);
      expect(history[1].decision).to.equal(ReviewStatus.Attested);
      expect(history[1].reason).to.equal(ReasonCode.DocumentReviewed);
      expect(await registry.reviewEventCount()).to.equal(2n);
    });

    it("does not release allocation capacity when an expense is flagged", async function () {
      const { registry, ngo, auditor } = await networkHelpers.loadFixture(
        allocationFixture,
      );

      await registry
        .connect(ngo)
        .submitExpense(ids.expense, ids.allocation, 600_000n, receiptHash);
      await registry
        .connect(auditor)
        .reviewExpense(
          ids.expense,
          ReviewStatus.Flagged,
          ReasonCode.AmountDiscrepancy,
        );

      await expect(
        registry
          .connect(ngo)
          .submitExpense(ids.secondExpense, ids.allocation, 1n, receiptHash),
      )
        .to.be.revertedWithCustomError(registry, "ExpenseLimitExceeded")
        .withArgs(ids.allocation, 0n, 1n);

      expect(await registry.totalExpenseClaimsPaise()).to.equal(600_000n);
    });
  });

  describe("record getters", function () {
    it("distinguishes missing records from zero-valued data", async function () {
      const { registry } = await networkHelpers.loadFixture(deployRegistryFixture);

      await expect(registry.getDonation(ids.donation))
        .to.be.revertedWithCustomError(registry, "DonationNotFound")
        .withArgs(ids.donation);
      await expect(registry.getAllocation(ids.allocation))
        .to.be.revertedWithCustomError(registry, "AllocationNotFound")
        .withArgs(ids.allocation);
      await expect(registry.getExpense(ids.expense))
        .to.be.revertedWithCustomError(registry, "ExpenseNotFound")
        .withArgs(ids.expense);
      await expect(registry.getReviewHistory(ids.expense))
        .to.be.revertedWithCustomError(registry, "ExpenseNotFound")
        .withArgs(ids.expense);
    });
  });
});
