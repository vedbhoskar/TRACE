import { network } from "hardhat";
import { loadCanonicalDemo } from "./lib/demo.js";
import { queryInBlockChunks } from "./lib/events.js";
import {
  assertDeploymentNetwork,
  explorerUrl,
  loadDeployment,
  saveDeployment,
  type DeploymentRecord,
  type RecordedTransaction,
} from "./lib/deployment.js";

const connection = await network.create();
const { ethers } = connection;
const networkInfo = await ethers.provider.getNetwork();
const deployment = await loadDeployment(connection.networkName);
assertDeploymentNetwork(deployment, connection.networkName, networkInfo.chainId);

const [ngo, reviewer] = await ethers.getSigners();
if (ngo === undefined || reviewer === undefined) {
  throw new Error("Two configured accounts are required: NGO first, reviewer second");
}
if (ngo.address.toLowerCase() !== deployment.ngoAddress.toLowerCase()) {
  throw new Error("Configured NGO does not match the deployment metadata");
}
if (reviewer.address.toLowerCase() !== deployment.reviewerAddress.toLowerCase()) {
  throw new Error("Configured reviewer does not match the deployment metadata");
}

const registry = await ethers.getContractAt(
  "ProofRegistry",
  deployment.contractAddress,
  ngo,
);
const demo = await loadCanonicalDemo();
const seedReadBlock = await ethers.provider.getBlockNumber();

async function hasEvent(
  filter: Parameters<typeof registry.queryFilter>[0],
): Promise<boolean> {
  const events = await queryInBlockChunks(
    deployment.deploymentBlock,
    seedReadBlock,
    (fromBlock, toBlock) => registry.queryFilter(filter, fromBlock, toBlock),
  );
  return events.length > 0;
}

async function confirm(
  action: string,
  recordId: string,
  transactionPromise: ReturnType<typeof registry.recordDonation>,
): Promise<void> {
  const transaction = await transactionPromise;
  console.log(`${action} pending: ${transaction.hash}`);
  const receipt = await transaction.wait();
  if (receipt === null || receipt.status !== 1) {
    throw new Error(`${action} was not confirmed successfully`);
  }

  const recorded: RecordedTransaction = {
    action,
    recordId,
    hash: receipt.hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: explorerUrl(deployment.explorerBaseUrl, "tx", receipt.hash),
  };
  if (!deployment.transactions.some((item) => item.hash === recorded.hash)) {
    deployment.transactions.push(recorded);
  }
  await saveDeployment(connection.networkName, deployment);
}

if (!(await hasEvent(registry.filters.DonationRecorded(demo.donation.id)))) {
  await confirm(
    "recordDonation",
    demo.donation.id,
    registry.connect(ngo).recordDonation(demo.donation.id, demo.donation.amountPaise),
  );
}

for (const allocation of demo.allocations) {
  if (!(await hasEvent(registry.filters.AllocationRecorded(allocation.id)))) {
    await confirm(
      "recordAllocation",
      allocation.id,
      registry
        .connect(ngo)
        .recordAllocation(
          allocation.id,
          allocation.donationId,
          allocation.amountPaise,
          allocation.category,
        ),
    );
  }
}

for (const expense of demo.expenses) {
  if (!(await hasEvent(registry.filters.ExpenseSubmitted(expense.id)))) {
    await confirm(
      "submitExpense",
      expense.id,
      registry
        .connect(ngo)
        .submitExpense(
          expense.id,
          expense.allocationId,
          expense.amountPaise,
          expense.receiptHash,
        ),
    );
  }
}

const reviewerRegistry = registry.connect(reviewer);
for (const review of demo.reviews) {
  const expense = await registry.getExpense(review.expenseId);
  if (expense.reviewCount === 0n) {
    await confirm(
      "reviewExpense",
      review.expenseId,
      reviewerRegistry.reviewExpense(
        review.expenseId,
        review.decision,
        review.reason,
      ),
    );
  } else if (
    expense.latestReviewStatus !== BigInt(review.decision) ||
    expense.latestReviewReason !== BigInt(review.reason)
  ) {
    throw new Error(`Existing review conflicts with canonical state for ${review.expenseId}`);
  }
}

deployment.seeded = true;
await saveDeployment(connection.networkName, deployment);
console.log(`Seed complete with ${deployment.transactions.length} confirmed writes`);
