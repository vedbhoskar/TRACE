import type { DemoDataset, ReviewStatus } from '../types'

export interface DemoMetrics {
  recordedDonationsPaise: bigint
  allocatedPaise: bigint
  unallocatedPaise: bigint
  expenseClaimsPaise: bigint
  allocatedNotClaimedPaise: bigint
  attestedPaise: bigint
  flaggedPaise: bigint
  awaitingReviewPaise: bigint
  claimedUtilization: string
  reviewedValueCoverage: string
  attestedValueCoverage: string
}

function sum(values: readonly bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n)
}

function expenseValueForStatus(
  dataset: DemoDataset,
  status: ReviewStatus,
): bigint {
  return sum(
    dataset.expenses
      .filter((expense) => expense.latestReview === status)
      .map((expense) => expense.amountPaise),
  )
}

export function formatPercentage(
  numerator: bigint,
  denominator: bigint,
): string {
  if (denominator === 0n) {
    return 'Not applicable'
  }

  if (numerator < 0n || denominator < 0n) {
    throw new Error('Percentage values cannot be negative')
  }

  const tenthsOfPercent = (numerator * 1000n + denominator / 2n) / denominator
  return `${tenthsOfPercent / 10n}.${tenthsOfPercent % 10n}%`
}

export function computeMetrics(dataset: DemoDataset): DemoMetrics {
  const recordedDonationsPaise = sum(dataset.donations.map((item) => item.amountPaise))
  const allocatedPaise = sum(dataset.allocations.map((item) => item.amountPaise))
  const expenseClaimsPaise = sum(dataset.expenses.map((item) => item.amountPaise))
  const attestedPaise = expenseValueForStatus(dataset, 'attested')
  const flaggedPaise = expenseValueForStatus(dataset, 'flagged')
  const awaitingReviewPaise = expenseValueForStatus(dataset, 'unreviewed')

  if (allocatedPaise > recordedDonationsPaise) {
    throw new Error('Fixture allocations exceed recorded donations')
  }

  if (expenseClaimsPaise > allocatedPaise) {
    throw new Error('Fixture expense claims exceed allocations')
  }

  if (attestedPaise + flaggedPaise + awaitingReviewPaise !== expenseClaimsPaise) {
    throw new Error('Review buckets do not reconcile with expense claims')
  }

  return {
    recordedDonationsPaise,
    allocatedPaise,
    unallocatedPaise: recordedDonationsPaise - allocatedPaise,
    expenseClaimsPaise,
    allocatedNotClaimedPaise: allocatedPaise - expenseClaimsPaise,
    attestedPaise,
    flaggedPaise,
    awaitingReviewPaise,
    claimedUtilization: formatPercentage(expenseClaimsPaise, recordedDonationsPaise),
    reviewedValueCoverage: formatPercentage(
      attestedPaise + flaggedPaise,
      expenseClaimsPaise,
    ),
    attestedValueCoverage: formatPercentage(attestedPaise, expenseClaimsPaise),
  }
}
