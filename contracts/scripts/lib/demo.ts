import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { encodeBytes32String } from "ethers";

const receiptDirectory = fileURLToPath(
  new URL("../../../frontend/public/receipts/", import.meta.url),
);

export const Category = {
  Food: 0,
  Medical: 1,
  Logistics: 2,
} as const;

export const ReviewStatus = {
  Unreviewed: 0,
  Attested: 1,
  Flagged: 2,
} as const;

export const ReasonCode = {
  None: 0,
  DocumentReviewed: 1,
  InsufficientEvidence: 2,
  AmountDiscrepancy: 3,
  Other: 4,
} as const;

export const demoIds = {
  campaign: encodeBytes32String("CAM-FLOOD-01"),
  donation: encodeBytes32String("DON-8F42A1"),
  foodAllocation: encodeBytes32String("AL-FOOD-01"),
  medicalAllocation: encodeBytes32String("AL-MED-01"),
  logisticsAllocation: encodeBytes32String("AL-LOG-01"),
  foodExpense: encodeBytes32String("EX-FOOD-01"),
  medicalExpense: encodeBytes32String("EX-MED-01"),
  logisticsExpense: encodeBytes32String("EX-LOG-01"),
} as const;

const expectedReceiptDigests = {
  "food-supplies-original.svg":
    "0x24a51254bb2fa86a85ad7546fd696b87d3e3c792c8bf140f5dc806ee76e4c431",
  "medical-supplies.svg":
    "0x9d809b56caa0acd349a3157ab6a6ee327b78aedb0b1179c1fd518dfc8b4afe79",
  "logistics.svg":
    "0xa2db0324f4cc547235a62343efc31549114dc567f3f55f13494f391f46702b94",
} as const;

async function digestReceipt(fileName: keyof typeof expectedReceiptDigests) {
  const bytes = await readFile(`${receiptDirectory}${fileName}`);
  return `0x${createHash("sha256").update(bytes).digest("hex")}`;
}

export async function loadCanonicalDemo() {
  const digests = {
    food: await digestReceipt("food-supplies-original.svg"),
    medical: await digestReceipt("medical-supplies.svg"),
    logistics: await digestReceipt("logistics.svg"),
  } as const;

  const checks = [
    [digests.food, expectedReceiptDigests["food-supplies-original.svg"]],
    [digests.medical, expectedReceiptDigests["medical-supplies.svg"]],
    [digests.logistics, expectedReceiptDigests["logistics.svg"]],
  ];

  for (const [actual, expected] of checks) {
    if (actual !== expected) {
      throw new Error(
        `Frozen receipt digest mismatch: expected ${expected}, received ${actual}`,
      );
    }
  }

  return {
    campaignId: demoIds.campaign,
    donation: { id: demoIds.donation, amountPaise: 1_000_000n },
    allocations: [
      {
        id: demoIds.foodAllocation,
        donationId: demoIds.donation,
        amountPaise: 600_000n,
        category: Category.Food,
      },
      {
        id: demoIds.medicalAllocation,
        donationId: demoIds.donation,
        amountPaise: 250_000n,
        category: Category.Medical,
      },
      {
        id: demoIds.logisticsAllocation,
        donationId: demoIds.donation,
        amountPaise: 150_000n,
        category: Category.Logistics,
      },
    ],
    expenses: [
      {
        id: demoIds.foodExpense,
        allocationId: demoIds.foodAllocation,
        amountPaise: 480_000n,
        receiptHash: digests.food,
      },
      {
        id: demoIds.medicalExpense,
        allocationId: demoIds.medicalAllocation,
        amountPaise: 200_000n,
        receiptHash: digests.medical,
      },
      {
        id: demoIds.logisticsExpense,
        allocationId: demoIds.logisticsAllocation,
        amountPaise: 90_000n,
        receiptHash: digests.logistics,
      },
    ],
    reviews: [
      {
        expenseId: demoIds.foodExpense,
        decision: ReviewStatus.Attested,
        reason: ReasonCode.DocumentReviewed,
      },
      {
        expenseId: demoIds.logisticsExpense,
        decision: ReviewStatus.Flagged,
        reason: ReasonCode.AmountDiscrepancy,
      },
    ],
  } as const;
}
