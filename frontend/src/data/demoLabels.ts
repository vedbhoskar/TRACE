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
