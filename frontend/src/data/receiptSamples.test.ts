import { describe, expect, it } from 'vitest'
import { demoDataset, receiptFixtures } from './campaign'
import { receiptSamplesForExpense } from './receiptSamples'

describe('receipt sample routing', () => {
  it('provides a matching sample for every canonical expense', () => {
    for (const expense of demoDataset.expenses) {
      const samples = receiptSamplesForExpense(expense.id)
      expect(samples.some((sample) => sample.expectedToMatch)).toBe(true)
      expect(samples.find((sample) => sample.expectedToMatch)?.fileName).toBe(
        expense.receipt.fileName,
      )
    }
  })

  it('keeps the altered food sample visibly separate from the anchored original', () => {
    const samples = receiptSamplesForExpense('EX-FOOD-01')
    expect(samples).toHaveLength(2)
    expect(samples[0].fileName).toBe(receiptFixtures.foodOriginal.fileName)
    expect(samples[1].fileName).toBe(receiptFixtures.foodAltered.fileName)
    expect(samples[1].expectedToMatch).toBe(false)
  })

  it('does not invent samples for unknown or newly submitted claims', () => {
    expect(receiptSamplesForExpense('EX-UNKNOWN')).toEqual([])
  })
})
