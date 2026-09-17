import type { ChainExpense } from '../chainTypes'
import type { ReviewReason, ReviewStatus } from '../types'
import type { ExpenseTransaction } from './wallet'

export type ReviewDecision = Exclude<ReviewStatus, 'unreviewed'>

export interface PreparedReview {
  expenseId: string
  decision: ReviewDecision
  decisionCode: 1 | 2
  reason: ReviewReason
  reasonCode: 1 | 2 | 3 | 4
}

export type ReviewCheck =
  | 'missing'
  | 'unknown'
  | { decisionCode: number; reasonCode: number; reviewCount: bigint }

export interface ReviewGateway {
  checkReview(expenseId: string): Promise<ReviewCheck>
  submitReview(review: PreparedReview): Promise<ExpenseTransaction>
}

export type ReviewUpdate =
  | { status: 'awaiting-wallet' }
  | { status: 'pending'; transactionHash: string }
  | { status: 'confirmed'; transactionHash: string; recovered: boolean; refreshed: boolean }
  | { status: 'rejected'; message: string }
  | { status: 'failed'; transactionHash?: string; message: string }
  | { status: 'uncertain'; transactionHash?: string; message: string }

const decisionCodes = { attested: 1, flagged: 2 } as const
const reasonCodes = {
  DOCUMENT_REVIEWED: 1,
  INSUFFICIENT_EVIDENCE: 2,
  AMOUNT_DISCREPANCY: 3,
  OTHER: 4,
} as const

export function reviewStateAfterWalletChange(state: ReviewUpdate | null): ReviewUpdate | null {
  if (state?.status === 'awaiting-wallet') {
    return { status: 'failed', message: 'The wallet account or network changed before a transaction hash was received. Your review choices were preserved.' }
  }
  if (state?.status === 'pending') {
    return { status: 'uncertain', transactionHash: state.transactionHash, message: 'The wallet account or network changed while confirmation was pending. Check this transaction before retrying.' }
  }
  return state
}

export function prepareReview(input: {
  expense: ChainExpense | undefined
  decision: string
  reason: string
}): PreparedReview {
  if (!input.expense) throw new Error('Select a known expense claim')
  if (input.decision !== 'attested' && input.decision !== 'flagged') {
    throw new Error('Choose Attest or Flag')
  }
  if (!(input.reason in reasonCodes)) throw new Error('Choose a valid review reason')
  const reason = input.reason as ReviewReason
  const decision = input.decision as ReviewDecision
  const latest = input.expense.reviewHistory.at(-1)
  if (input.expense.latestReview === decision && latest?.reasonCode === reasonCodes[reason]) {
    throw new Error('This decision and reason are already the latest recorded review')
  }
  return {
    expenseId: input.expense.id,
    decision,
    decisionCode: decisionCodes[decision],
    reason,
    reasonCode: reasonCodes[reason],
  }
}

function rejected(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  return error.code === 4001 || error.code === 'ACTION_REJECTED'
}

function matches(check: ReviewCheck, review: PreparedReview): boolean {
  return typeof check === 'object'
    && check.decisionCode === review.decisionCode
    && check.reasonCode === review.reasonCode
}

export async function submitPreparedReview(
  gateway: ReviewGateway,
  review: PreparedReview,
  update: (state: ReviewUpdate) => void,
  afterConfirmed: () => Promise<boolean | void> = async () => undefined,
): Promise<ReviewUpdate> {
  const before = await gateway.checkReview(review.expenseId)
  if (before === 'missing') {
    const result: ReviewUpdate = { status: 'failed', message: 'This expense no longer exists.' }
    update(result)
    return result
  }
  if (before === 'unknown') {
    const result: ReviewUpdate = { status: 'uncertain', message: 'The latest review could not be checked. No transaction was requested.' }
    update(result)
    return result
  }
  if (matches(before, review)) {
    const result: ReviewUpdate = { status: 'failed', message: 'This decision and reason are already recorded.' }
    update(result)
    return result
  }

  update({ status: 'awaiting-wallet' })
  let transaction: ExpenseTransaction
  try {
    transaction = await gateway.submitReview(review)
  } catch (error) {
    const result: ReviewUpdate = rejected(error)
      ? { status: 'rejected', message: 'The wallet request was rejected. Your review choices were preserved.' }
      : { status: 'failed', message: 'The wallet could not submit the review. Your choices were preserved.' }
    update(result)
    return result
  }

  update({ status: 'pending', transactionHash: transaction.hash })
  try {
    const receipt = await transaction.wait()
    if (!receipt || receipt.status !== 1) {
      const result: ReviewUpdate = { status: 'failed', transactionHash: transaction.hash, message: 'The review transaction was mined but did not succeed.' }
      update(result)
      return result
    }
    let refreshed = false
    try { refreshed = (await afterConfirmed()) !== false } catch { refreshed = false }
    const result: ReviewUpdate = { status: 'confirmed', transactionHash: transaction.hash, recovered: false, refreshed }
    update(result)
    return result
  } catch {
    const after = await gateway.checkReview(review.expenseId)
    if (matches(after, review)) {
      let refreshed = false
      try { refreshed = (await afterConfirmed()) !== false } catch { refreshed = false }
      const result: ReviewUpdate = { status: 'confirmed', transactionHash: transaction.hash, recovered: true, refreshed }
      update(result)
      return result
    }
    const result: ReviewUpdate = {
      status: 'uncertain',
      transactionHash: transaction.hash,
      message: 'Confirmation was interrupted. Check the transaction and latest review before retrying.',
    }
    update(result)
    return result
  }
}
