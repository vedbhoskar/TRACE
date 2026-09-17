import type { CanonicalId, ReviewStatus } from './types'

export interface ChainReference {
  transactionHash: string
  blockNumber: number
  transactionIndex: number
  logIndex: number
  explorerUrl: string
}

export interface ChainDonation {
  id: CanonicalId
  amountPaise: bigint
  allocatedPaise: bigint
  submitter: string
  recordedAt: number | null
  chain: ChainReference
}

export interface ChainAllocation {
  id: CanonicalId
  donationId: CanonicalId
  amountPaise: bigint
  claimedPaise: bigint
  categoryCode: number
  submitter: string
  recordedAt: number | null
  chain: ChainReference
}

export interface ChainReview {
  expenseId: CanonicalId
  decision: ReviewStatus
  reasonCode: number
  reviewer: string
  reviewedAt: number | null
  reviewNumber: bigint
  chain: ChainReference
}

export interface ChainExpense {
  id: CanonicalId
  allocationId: CanonicalId
  amountPaise: bigint
  receiptHash: string
  submitter: string
  submittedAt: number | null
  latestReview: ReviewStatus
  reviewHistory: ChainReview[]
  chain: ChainReference
}

export type TimelineKind =
  | 'donation'
  | 'allocation'
  | 'expense'
  | 'review'

export interface TimelineEntry {
  kind: TimelineKind
  recordId: CanonicalId
  timestamp: number | null
  chain: ChainReference
}

export type ProofSource =
  | { mode: 'live'; syncedBlock: number }
  | { mode: 'snapshot'; syncedBlock: number }

export interface ProofData {
  campaignId: CanonicalId
  ngoAddress: string
  reviewerAddress: string
  contractAddress: string
  chainId: number
  explorerBaseUrl: string
  source: ProofSource
  donations: ChainDonation[]
  allocations: ChainAllocation[]
  expenses: ChainExpense[]
  timeline: TimelineEntry[]
}
