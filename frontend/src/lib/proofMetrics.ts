import type { ProofData } from '../chainTypes'
import { formatPercentage } from './metrics'

function sum(values: readonly bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n)
}

export function computeProofMetrics(data: ProofData) {
  const recordedDonationsPaise = sum(data.donations.map((item) => item.amountPaise))
  const allocatedPaise = sum(data.allocations.map((item) => item.amountPaise))
  const expenseClaimsPaise = sum(data.expenses.map((item) => item.amountPaise))
  const attestedPaise = sum(
    data.expenses.filter((item) => item.latestReview === 'attested').map((item) => item.amountPaise),
  )
  const flaggedPaise = sum(
    data.expenses.filter((item) => item.latestReview === 'flagged').map((item) => item.amountPaise),
  )
  const awaitingReviewPaise = sum(
    data.expenses.filter((item) => item.latestReview === 'unreviewed').map((item) => item.amountPaise),
  )

  if (allocatedPaise > recordedDonationsPaise || expenseClaimsPaise > allocatedPaise) {
    throw new Error('Confirmed chain records violate expected capacity limits')
  }
  if (attestedPaise + flaggedPaise + awaitingReviewPaise !== expenseClaimsPaise) {
    throw new Error('Confirmed review buckets do not reconcile')
  }

  return {
    recordedDonationsPaise,
    allocatedPaise,
    expenseClaimsPaise,
    attestedPaise,
    flaggedPaise,
    awaitingReviewPaise,
    allocatedNotClaimedPaise: allocatedPaise - expenseClaimsPaise,
    claimedUtilization: formatPercentage(expenseClaimsPaise, recordedDonationsPaise),
  }
}
