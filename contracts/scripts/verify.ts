import assert from "node:assert/strict";
import { network } from "hardhat";
import { loadCanonicalDemo, ReasonCode, ReviewStatus } from "./lib/demo.js";
import { queryInBlockChunks } from "./lib/events.js";
import {
  assertDeploymentNetwork,
  explorerUrl,
  loadDeployment,
} from "./lib/deployment.js";

const connection = await network.create();
const { ethers } = connection;
const networkInfo = await ethers.provider.getNetwork();
const deployment = await loadDeployment(
  connection.networkName === "sepoliaRead" ? "sepolia" : connection.networkName,
);
assertDeploymentNetwork(
  deployment,
  connection.networkName === "sepoliaRead" ? "sepolia" : connection.networkName,
  networkInfo.chainId,
);

const demo = await loadCanonicalDemo();
const code = await ethers.provider.getCode(deployment.contractAddress);
assert.notEqual(code, "0x", "No contract code exists at the deployed address");

const registry = await ethers.getContractAt(
  "ProofRegistry",
  deployment.contractAddress,
);
assert.equal(await registry.campaignId(), demo.campaignId);
assert.equal((await registry.ngo()).toLowerCase(), deployment.ngoAddress.toLowerCase());
assert.equal(
  (await registry.auditor()).toLowerCase(),
  deployment.reviewerAddress.toLowerCase(),
);

assert.equal(await registry.donationCount(), 1n);
assert.equal(await registry.allocationCount(), 3n);
assert.equal(await registry.expenseCount(), 3n);
assert.equal(await registry.reviewEventCount(), 2n);
assert.equal(await registry.totalRecordedDonationsPaise(), 1_000_000n);
assert.equal(await registry.totalAllocatedPaise(), 1_000_000n);
assert.equal(await registry.totalExpenseClaimsPaise(), 770_000n);

const donation = await registry.getDonation(demo.donation.id);
assert.equal(donation.amountPaise, demo.donation.amountPaise);
assert.equal(donation.allocatedPaise, 1_000_000n);

for (const expected of demo.allocations) {
  const allocation = await registry.getAllocation(expected.id);
  assert.equal(allocation.donationId, expected.donationId);
  assert.equal(allocation.amountPaise, expected.amountPaise);
  assert.equal(allocation.category, BigInt(expected.category));
}

for (const expected of demo.expenses) {
  const expense = await registry.getExpense(expected.id);
  assert.equal(expense.allocationId, expected.allocationId);
  assert.equal(expense.amountPaise, expected.amountPaise);
  assert.equal(expense.receiptHash, expected.receiptHash);
}

const foodExpense = await registry.getExpense(demo.expenses[0].id);
const medicalExpense = await registry.getExpense(demo.expenses[1].id);
const logisticsExpense = await registry.getExpense(demo.expenses[2].id);
assert.equal(foodExpense.latestReviewStatus, BigInt(ReviewStatus.Attested));
assert.equal(foodExpense.latestReviewReason, BigInt(ReasonCode.DocumentReviewed));
assert.equal(medicalExpense.latestReviewStatus, BigInt(ReviewStatus.Unreviewed));
assert.equal(logisticsExpense.latestReviewStatus, BigInt(ReviewStatus.Flagged));
assert.equal(
  logisticsExpense.latestReviewReason,
  BigInt(ReasonCode.AmountDiscrepancy),
);

const verificationBlock = await ethers.provider.getBlockNumber();
const donationEvents = await queryInBlockChunks(
  deployment.deploymentBlock,
  verificationBlock,
  (fromBlock, toBlock) =>
    registry.queryFilter(registry.filters.DonationRecorded(), fromBlock, toBlock),
);
const allocationEvents = await queryInBlockChunks(
  deployment.deploymentBlock,
  verificationBlock,
  (fromBlock, toBlock) =>
    registry.queryFilter(registry.filters.AllocationRecorded(), fromBlock, toBlock),
);
const expenseEvents = await queryInBlockChunks(
  deployment.deploymentBlock,
  verificationBlock,
  (fromBlock, toBlock) =>
    registry.queryFilter(registry.filters.ExpenseSubmitted(), fromBlock, toBlock),
);
const reviewEvents = await queryInBlockChunks(
  deployment.deploymentBlock,
  verificationBlock,
  (fromBlock, toBlock) =>
    registry.queryFilter(registry.filters.ExpenseReviewed(), fromBlock, toBlock),
);
assert.equal(donationEvents.length, 1);
assert.equal(allocationEvents.length, 3);
assert.equal(expenseEvents.length, 3);
assert.equal(reviewEvents.length, 2);

console.log("Verified canonical on-chain state:");
console.log(`  Contract: ${deployment.contractAddress}`);
console.log("  Records: 1 donation · 3 allocations · 3 expenses · 2 reviews");
console.log("  Totals: ₹10,000 recorded · ₹10,000 allocated · ₹7,700 claimed");
console.log(
  explorerUrl(deployment.explorerBaseUrl, "address", deployment.contractAddress) ??
    "  Local network",
);
