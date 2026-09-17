import { describe, expect, it, vi } from 'vitest'
import type { ChainExpense } from '../chainTypes'
import { createSubmissionGuard } from './expenseSubmission'
import {
  prepareReview,
  submitPreparedReview,
  type PreparedReview,
  type ReviewGateway,
  type ReviewUpdate,
} from './reviewSubmission'

const reference = { transactionHash: '0x01', blockNumber: 1, transactionIndex: 0, logIndex: 0, explorerUrl: 'https://example.test' }
const expense: ChainExpense = {
  id: 'EX-LOG-01', allocationId: 'AL-LOG-01', amountPaise: 90_000n,
  receiptHash: `0x${'12'.repeat(32)}`, submitter: '0x0000000000000000000000000000000000000001',
  submittedAt: 1, latestReview: 'flagged', chain: reference,
  reviewHistory: [{ expenseId: 'EX-LOG-01', decision: 'flagged', reasonCode: 3, reviewer: '0x0000000000000000000000000000000000000002', reviewedAt: 1, reviewNumber: 1n, chain: reference }],
}
const prepared: PreparedReview = { expenseId: expense.id, decision: 'attested', decisionCode: 1, reason: 'DOCUMENT_REVIEWED', reasonCode: 1 }

function gateway(options: { before?: 'missing' | 'unknown' | { decisionCode: number; reasonCode: number; reviewCount: bigint }; after?: 'missing' | 'unknown' | { decisionCode: number; reasonCode: number; reviewCount: bigint }; submitError?: unknown; waitStatus?: number | null; waitError?: boolean } = {}): ReviewGateway {
  let checks = 0
  return {
    checkReview: vi.fn(async () => ++checks === 1 ? options.before ?? { decisionCode: 2, reasonCode: 3, reviewCount: 1n } : options.after ?? 'unknown'),
    submitReview: vi.fn(async () => {
      if (options.submitError) throw options.submitError
      return { hash: '0x02', wait: vi.fn(async () => { if (options.waitError) throw new Error('transport'); return { status: options.waitStatus ?? 1 } }) }
    }),
  }
}

describe('review preparation', () => {
  it('maps supported decisions and all reason codes to contract enums', () => {
    expect(prepareReview({ expense, decision: 'attested', reason: 'DOCUMENT_REVIEWED' })).toMatchObject({ decisionCode: 1, reasonCode: 1 })
    expect(prepareReview({ expense, decision: 'flagged', reason: 'INSUFFICIENT_EVIDENCE' })).toMatchObject({ decisionCode: 2, reasonCode: 2 })
    expect(prepareReview({ expense, decision: 'attested', reason: 'AMOUNT_DISCREPANCY' })).toMatchObject({ reasonCode: 3 })
    expect(prepareReview({ expense, decision: 'attested', reason: 'OTHER' })).toMatchObject({ reasonCode: 4 })
  })

  it('rejects missing expenses, invalid decisions, and invalid reasons', () => {
    expect(() => prepareReview({ expense: undefined, decision: 'attested', reason: 'OTHER' })).toThrow('known expense')
    expect(() => prepareReview({ expense, decision: 'unreviewed', reason: 'OTHER' })).toThrow('Attest or Flag')
    expect(() => prepareReview({ expense, decision: 'flagged', reason: 'NONE' })).toThrow('valid review reason')
  })

  it('blocks an identical latest decision and reason but permits a corrected re-review', () => {
    expect(() => prepareReview({ expense, decision: 'flagged', reason: 'AMOUNT_DISCREPANCY' })).toThrow('already')
    expect(prepareReview({ expense, decision: 'attested', reason: 'DOCUMENT_REVIEWED' }).decision).toBe('attested')
  })
})

describe('review transaction lifecycle', () => {
  it('blocks a missing, uncertain, or identical current review before the wallet', async () => {
    for (const before of ['missing', 'unknown', { decisionCode: 1, reasonCode: 1, reviewCount: 2n }] as const) {
      const api = gateway({ before })
      const result = await submitPreparedReview(api, prepared, vi.fn())
      expect(['failed', 'uncertain']).toContain(result.status)
      expect(api.submitReview).not.toHaveBeenCalled()
    }
  })

  it('distinguishes rejection, wallet failure, and mined failure', async () => {
    expect((await submitPreparedReview(gateway({ submitError: { code: 4001 } }), prepared, vi.fn())).status).toBe('rejected')
    expect((await submitPreparedReview(gateway({ submitError: new Error('estimate failed') }), prepared, vi.fn())).status).toBe('failed')
    expect((await submitPreparedReview(gateway({ waitStatus: 0 }), prepared, vi.fn())).status).toBe('failed')
  })

  it('confirms and refreshes the latest state after a successful receipt', async () => {
    const updates: ReviewUpdate[] = []
    const refresh = vi.fn(async () => undefined)
    expect((await submitPreparedReview(gateway(), prepared, (value) => updates.push(value), refresh)).status).toBe('confirmed')
    expect(updates.map((value) => value.status)).toEqual(['awaiting-wallet', 'pending', 'confirmed'])
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('recovers an interrupted receipt only when the requested latest review is visible', async () => {
    const current = { decisionCode: 1, reasonCode: 1, reviewCount: 2n }
    const recovered = await submitPreparedReview(gateway({ waitError: true, after: current }), prepared, vi.fn())
    const uncertain = await submitPreparedReview(gateway({ waitError: true, after: 'unknown' }), prepared, vi.fn())
    expect(recovered).toMatchObject({ status: 'confirmed', recovered: true })
    expect(uncertain.status).toBe('uncertain')
  })

  it('prevents duplicate review clicks while one operation is active', async () => {
    const guard = createSubmissionGuard()
    let release!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    const task = vi.fn(async () => pending)
    const first = guard.run(task)
    expect(await guard.run(task)).toBeUndefined()
    expect(task).toHaveBeenCalledOnce()
    release()
    await first
  })
})
