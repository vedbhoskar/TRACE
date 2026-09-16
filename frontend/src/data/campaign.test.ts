import { describe, expect, it } from 'vitest'
import { canonicalizeId } from '../lib/ids'
import { demoDataset } from './campaign'

describe('canonical demonstration dataset', () => {
  it('uses unique canonical IDs with valid parent relationships', () => {
    const ids = [
      demoDataset.campaign.id,
      ...demoDataset.donations.map((item) => item.id),
      ...demoDataset.allocations.map((item) => item.id),
      ...demoDataset.expenses.map((item) => item.id),
    ]

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => canonicalizeId(id) === id)).toBe(true)
    expect(demoDataset.donations.every((item) => item.campaignId === demoDataset.campaign.id)).toBe(true)
    expect(demoDataset.allocations.every((item) =>
      demoDataset.donations.some((donation) => donation.id === item.donationId),
    )).toBe(true)
    expect(demoDataset.expenses.every((item) =>
      demoDataset.allocations.some((allocation) => allocation.id === item.allocationId),
    )).toBe(true)
  })

  it('keeps each allocation within its declared capacity', () => {
    for (const allocation of demoDataset.allocations) {
      const claimed = demoDataset.expenses
        .filter((expense) => expense.allocationId === allocation.id)
        .reduce((total, expense) => total + expense.amountPaise, 0n)
      expect(claimed).toBeLessThanOrEqual(allocation.amountPaise)
    }
  })
})
