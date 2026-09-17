import type {
  ChainAllocation,
  ChainDonation,
  ChainExpense,
  ChainReference,
  ChainReview,
  ProofData,
  TimelineEntry,
} from '../chainTypes'
import deploymentJson from '../generated/deployment.json'
import type { CanonicalId } from '../types'
import { demoDataset } from './campaign'
import { bytes32ToId } from '../lib/ids'

interface PublicTransaction {
  action: string
  recordId: string
  hash: string
  blockNumber: number
  explorerUrl: string
}

interface PublicDeployment {
  chainId: number
  contractAddress: string
  campaignId: string
  ngoAddress: string
  reviewerAddress: string
  explorerBaseUrl: string
  transactions: PublicTransaction[]
}

const deployment = deploymentJson as PublicDeployment
const categoryCodes = { FOOD: 0, MEDICAL: 1, LOGISTICS: 2 } as const

function transaction(action: string, id: CanonicalId): ChainReference {
  const item = deployment.transactions.find(
    (candidate) =>
      candidate.action === action && bytes32ToId(candidate.recordId) === id,
  )
  if (!item) throw new Error(`Snapshot transaction missing for ${action} ${id}`)
  return {
    transactionHash: item.hash,
    blockNumber: item.blockNumber,
    transactionIndex: 0,
    logIndex: 0,
    explorerUrl: item.explorerUrl,
  }
}

export function createCanonicalSnapshot(): ProofData {
  const donations: ChainDonation[] = demoDataset.donations.map((item) => ({
    id: item.id,
    amountPaise: item.amountPaise,
    allocatedPaise: demoDataset.allocations
      .filter((allocation) => allocation.donationId === item.id)
      .reduce((total, allocation) => total + allocation.amountPaise, 0n),
    submitter: deployment.ngoAddress,
    recordedAt: null,
    chain: transaction('recordDonation', item.id),
  }))

  const allocations: ChainAllocation[] = demoDataset.allocations.map((item) => ({
    id: item.id,
    donationId: item.donationId,
    amountPaise: item.amountPaise,
    claimedPaise: demoDataset.expenses
      .filter((expense) => expense.allocationId === item.id)
      .reduce((total, expense) => total + expense.amountPaise, 0n),
    categoryCode: categoryCodes[item.category],
    submitter: deployment.ngoAddress,
    recordedAt: null,
    chain: transaction('recordAllocation', item.id),
  }))

  const reviews: ChainReview[] = demoDataset.expenses
    .filter((expense) => expense.latestReview !== 'unreviewed')
    .map((expense) => ({
      expenseId: expense.id,
      decision: expense.latestReview,
      reasonCode: expense.reviewReason === 'DOCUMENT_REVIEWED' ? 1 : 3,
      reviewer: deployment.reviewerAddress,
      reviewedAt: null,
      reviewNumber: 1n,
      chain: transaction('reviewExpense', expense.id),
    }))

  const expenses: ChainExpense[] = demoDataset.expenses.map((item) => ({
    id: item.id,
    allocationId: item.allocationId,
    amountPaise: item.amountPaise,
    receiptHash: item.receipt.sha256,
    submitter: deployment.ngoAddress,
    submittedAt: null,
    latestReview: item.latestReview,
    reviewHistory: reviews.filter((review) => review.expenseId === item.id),
    chain: transaction('submitExpense', item.id),
  }))

  const timeline: TimelineEntry[] = [
    ...donations.map((item) => ({
      kind: 'donation' as const,
      recordId: item.id,
      timestamp: item.recordedAt,
      chain: item.chain,
    })),
    ...allocations.map((item) => ({
      kind: 'allocation' as const,
      recordId: item.id,
      timestamp: item.recordedAt,
      chain: item.chain,
    })),
    ...expenses.map((item) => ({
      kind: 'expense' as const,
      recordId: item.id,
      timestamp: item.submittedAt,
      chain: item.chain,
    })),
    ...reviews.map((item) => ({
      kind: 'review' as const,
      recordId: item.expenseId,
      timestamp: item.reviewedAt,
      chain: item.chain,
    })),
  ].sort((left, right) => left.chain.blockNumber - right.chain.blockNumber)

  return {
    campaignId: demoDataset.campaign.id,
    ngoAddress: deployment.ngoAddress,
    reviewerAddress: deployment.reviewerAddress,
    contractAddress: deployment.contractAddress,
    chainId: deployment.chainId,
    explorerBaseUrl: deployment.explorerBaseUrl,
    source: {
      mode: 'snapshot',
      syncedBlock: Math.max(...deployment.transactions.map((item) => item.blockNumber)),
    },
    donations,
    allocations,
    expenses,
    timeline,
  }
}
