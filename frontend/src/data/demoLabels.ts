import type { CategoryCode, ReviewStatus } from '../types'

export const categoryLabels: Readonly<Record<CategoryCode, string>> = {
  FOOD: 'Food supplies',
  MEDICAL: 'Medical supplies',
  LOGISTICS: 'Logistics',
}

export const reviewLabels: Readonly<Record<ReviewStatus, string>> = {
  unreviewed: 'Unreviewed',
  attested: 'Attested',
  flagged: 'Flagged',
}

const categoryCodeLabels: Readonly<Record<number, string>> = {
  0: 'Food supplies',
  1: 'Medical supplies',
  2: 'Logistics',
}

const reasonCodeLabels: Readonly<Record<number, string>> = {
  0: 'No reason',
  1: 'Document reviewed',
  2: 'Insufficient evidence',
  3: 'Amount discrepancy',
  4: 'Other',
}

export function categoryLabel(code: number): string {
  return categoryCodeLabels[code] ?? `Unknown category (${code})`
}

export function reasonLabel(code: number): string {
  return reasonCodeLabels[code] ?? `Unknown reason (${code})`
}
