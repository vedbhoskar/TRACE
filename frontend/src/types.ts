export type CanonicalId = string

export type CategoryCode = 'FOOD' | 'MEDICAL' | 'LOGISTICS'

export type ReviewStatus = 'unreviewed' | 'attested' | 'flagged'

export type ReviewReason =
  | 'DOCUMENT_REVIEWED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'AMOUNT_DISCREPANCY'
  | 'OTHER'

export interface Campaign {
  id: CanonicalId
  title: string
  targetPaise: bigint
  isSynthetic: true
}

export interface Donation {
  id: CanonicalId
  campaignId: CanonicalId
  amountPaise: bigint
  sourceLabel: 'Synthetic donation record'
}

export interface Allocation {
  id: CanonicalId
  donationId: CanonicalId
  category: CategoryCode
  amountPaise: bigint
}

export interface ReceiptFixture {
  fileName: string
  publicPath: string
  sha256: `0x${string}`
}

export interface Expense {
  id: CanonicalId
  allocationId: CanonicalId
  amountPaise: bigint
  receipt: ReceiptFixture
  latestReview: ReviewStatus
  reviewReason?: ReviewReason
}

export interface DemoDataset {
  campaign: Campaign
  donations: readonly Donation[]
  allocations: readonly Allocation[]
  expenses: readonly Expense[]
}
