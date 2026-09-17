import { receiptFixtures } from './campaign'

export interface ReceiptSample {
  label: string
  fileName: string
  publicPath: string
  expectedToMatch: boolean
}

const samplesByExpense: Readonly<Record<string, readonly ReceiptSample[]>> = {
  'EX-FOOD-01': [
    {
      label: 'Original food receipt',
      ...receiptFixtures.foodOriginal,
      expectedToMatch: true,
    },
    {
      label: 'Visibly altered food receipt',
      ...receiptFixtures.foodAltered,
      expectedToMatch: false,
    },
  ],
  'EX-MED-01': [
    {
      label: 'Original medical receipt',
      ...receiptFixtures.medical,
      expectedToMatch: true,
    },
  ],
  'EX-LOG-01': [
    {
      label: 'Original logistics receipt',
      ...receiptFixtures.logistics,
      expectedToMatch: true,
    },
  ],
}

export function receiptSamplesForExpense(expenseId: string): readonly ReceiptSample[] {
  return samplesByExpense[expenseId] ?? []
}
