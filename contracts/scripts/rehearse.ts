import assert from "node:assert/strict";
import { network } from "hardhat";
import { loadCanonicalDemo, ReviewStatus } from "./lib/demo.js";

const connection = await network.create();
const { ethers } = connection;
const [ngo, reviewer] = await ethers.getSigners();
if (ngo === undefined || reviewer === undefined) {
  throw new Error("Local rehearsal requires two accounts");
}

const demo = await loadCanonicalDemo();
const registry = await ethers.deployContract(
  "ProofRegistry",
  [demo.campaignId, ngo.address, reviewer.address],
  ngo,
);
await registry.waitForDeployment();

await (
  await registry
    .connect(ngo)
    .recordDonation(demo.donation.id, demo.donation.amountPaise)
).wait();

for (const allocation of demo.allocations) {
  await (
    await registry
      .connect(ngo)
      .recordAllocation(
        allocation.id,
        allocation.donationId,
        allocation.amountPaise,
        allocation.category,
      )
  ).wait();
}

for (const expense of demo.expenses) {
  await (
    await registry
      .connect(ngo)
      .submitExpense(
        expense.id,
        expense.allocationId,
        expense.amountPaise,
        expense.receiptHash,
      )
  ).wait();
}

for (const review of demo.reviews) {
  await (
    await registry
      .connect(reviewer)
      .reviewExpense(review.expenseId, review.decision, review.reason)
  ).wait();
}

assert.equal(await registry.donationCount(), 1n);
assert.equal(await registry.allocationCount(), 3n);
assert.equal(await registry.expenseCount(), 3n);
assert.equal(await registry.reviewEventCount(), 2n);
assert.equal(await registry.totalRecordedDonationsPaise(), 1_000_000n);
assert.equal(await registry.totalAllocatedPaise(), 1_000_000n);
assert.equal(await registry.totalExpenseClaimsPaise(), 770_000n);

for (const expected of demo.expenses) {
  const expense = await registry.getExpense(expected.id);
  assert.equal(expense.receiptHash, expected.receiptHash);
}

assert.equal(
  (await registry.getExpense(demo.expenses[0].id)).latestReviewStatus,
  BigInt(ReviewStatus.Attested),
);
assert.equal(
  (await registry.getExpense(demo.expenses[1].id)).latestReviewStatus,
  BigInt(ReviewStatus.Unreviewed),
);
assert.equal(
  (await registry.getExpense(demo.expenses[2].id)).latestReviewStatus,
  BigInt(ReviewStatus.Flagged),
);

const deploymentBlock = registry.deploymentTransaction()?.blockNumber;
assert.notEqual(deploymentBlock, null);
assert.notEqual(deploymentBlock, undefined);
const fromBlock = deploymentBlock as number;
assert.equal(
  (await registry.queryFilter(registry.filters.DonationRecorded(), fromBlock)).length,
  1,
);
assert.equal(
  (await registry.queryFilter(registry.filters.AllocationRecorded(), fromBlock)).length,
  3,
);
assert.equal(
  (await registry.queryFilter(registry.filters.ExpenseSubmitted(), fromBlock)).length,
  3,
);
assert.equal(
  (await registry.queryFilter(registry.filters.ExpenseReviewed(), fromBlock)).length,
  2,
);

console.log("Local Stage 3 rehearsal passed:");
console.log("  1 donation · 3 allocations · 3 expenses · 2 reviews");
console.log("  ₹10,000 recorded · ₹10,000 allocated · ₹7,700 claimed");
console.log("  All frozen receipt digests match their exact source bytes");
