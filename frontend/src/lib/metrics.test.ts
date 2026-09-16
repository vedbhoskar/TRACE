import { describe, expect, it } from 'vitest'
import { demoDataset } from '../data/campaign'
import { computeMetrics, formatPercentage } from './metrics'

describe('canonical demo metrics', () => {
  it('reconciles the complete ₹10,000 trace', () => {
    expect(computeMetrics(demoDataset)).toEqual({
      recordedDonationsPaise: 1_000_000n,
      allocatedPaise: 1_000_000n,
      unallocatedPaise: 0n,
      expenseClaimsPaise: 770_000n,
      allocatedNotClaimedPaise: 230_000n,
      attestedPaise: 480_000n,
      flaggedPaise: 90_000n,
      awaitingReviewPaise: 200_000n,
      claimedUtilization: '77.0%',
      reviewedValueCoverage: '74.0%',
      attestedValueCoverage: '62.3%',
    })
  })

  it('uses Not applicable for a zero denominator', () => {
    expect(formatPercentage(0n, 0n)).toBe('Not applicable')
  })
})
