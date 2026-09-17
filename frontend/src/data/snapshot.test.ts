import { describe, expect, it } from 'vitest'
import { computeProofMetrics } from '../lib/proofMetrics'
import { createCanonicalSnapshot } from './snapshot'

describe('canonical public snapshot', () => {
  it('is explicitly labeled and reconciles with the confirmed deployment', () => {
    const snapshot = createCanonicalSnapshot()
    const metrics = computeProofMetrics(snapshot)

    expect(snapshot.source).toEqual({ mode: 'snapshot', syncedBlock: 11_718_560 })
    expect(snapshot.donations).toHaveLength(1)
    expect(snapshot.allocations).toHaveLength(3)
    expect(snapshot.expenses).toHaveLength(3)
    expect(snapshot.timeline).toHaveLength(9)
    expect(metrics.recordedDonationsPaise).toBe(1_000_000n)
    expect(metrics.expenseClaimsPaise).toBe(770_000n)
    expect(metrics.attestedPaise).toBe(480_000n)
    expect(metrics.flaggedPaise).toBe(90_000n)
    expect(metrics.awaitingReviewPaise).toBe(200_000n)
  })
})
