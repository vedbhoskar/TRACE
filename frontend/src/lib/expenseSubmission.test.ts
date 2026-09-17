import { describe, expect, it, vi } from 'vitest'
import type { ChainAllocation, ChainExpense } from '../chainTypes'
import {
  createSubmissionGuard,
  expenseStateAfterWalletChange,
  generateExpenseId,
  prepareExpense,
  resolveAllocationId,
  submitPreparedExpense,
  type PreparedExpense,
  type SubmissionUpdate,
} from './expenseSubmission'
import type { ExpenseGateway, ExpenseTransaction } from './wallet'

const digest = `0x${'12'.repeat(32)}` as `0x${string}`
const reference = {
  transactionHash: `0x${'34'.repeat(32)}`,
  blockNumber: 1,
  transactionIndex: 0,
  logIndex: 0,
  explorerUrl: 'https://example.test/tx/1',
}
const allocation: ChainAllocation = {
  id: 'AL-FOOD-01',
  donationId: 'DON-8F42A1',
  amountPaise: 600_000n,
  claimedPaise: 480_000n,
  categoryCode: 0,
  submitter: '0x0000000000000000000000000000000000000001',
  recordedAt: 1,
  chain: reference,
}
const existingExpense: ChainExpense = {
  id: 'EX-EXISTING-01',
  allocationId: allocation.id,
  amountPaise: 1n,
  receiptHash: digest,
  submitter: allocation.submitter,
  submittedAt: 1,
  latestReview: 'unreviewed',
  reviewHistory: [],
  chain: reference,
}
const prepared: PreparedExpense = {
  expenseId: 'EX-LIVE-01',
  allocationId: allocation.id,
  amountPaise: 120_000n,
  receiptHash: digest,
}

function gateway(options: {
  before?: 'exists' | 'missing' | 'unknown'
  after?: 'exists' | 'missing' | 'unknown'
  submitError?: unknown
  waitStatus?: number | null
  waitError?: boolean
} = {}): ExpenseGateway {
  let checks = 0
  return {
    checkExpense: vi.fn(async () => (++checks === 1 ? options.before ?? 'missing' : options.after ?? 'missing')),
    submitExpense: vi.fn(async () => {
      if (options.submitError) throw options.submitError
      return {
        hash: `0x${'56'.repeat(32)}`,
        wait: vi.fn(async () => {
          if (options.waitError) throw new Error('receipt transport failed')
          return { status: options.waitStatus ?? 1 }
        }),
      } satisfies ExpenseTransaction
    }),
  }
}

describe('expense preparation', () => {
  it('moves a fresh form off an exhausted allocation while preserving a confirmed summary', () => {
    expect(resolveAllocationId('AL-FOOD-01', ['AL-MED-01', 'AL-LOG-01'], false)).toBe('AL-MED-01')
    expect(resolveAllocationId('AL-FOOD-01', ['AL-MED-01', 'AL-LOG-01'], true)).toBe('AL-FOOD-01')
  })

  it('accepts the exact remaining allocation capacity', () => {
    expect(prepareExpense({
      expenseId: 'ex-live-01', allocationId: allocation.id, amount: '1200.00', receiptHash: digest,
      allocations: [allocation], expenses: [],
    }).amountPaise).toBe(120_000n)
  })

  it('rejects one paise above remaining capacity', () => {
    expect(() => prepareExpense({
      expenseId: 'EX-LIVE-01', allocationId: allocation.id, amount: '1200.01', receiptHash: digest,
      allocations: [allocation], expenses: [],
    })).toThrow('exceeds')
  })

  it.each(['', '-1', '1.001', '1e3', '0'])('rejects invalid INR input %j', (amount) => {
    expect(() => prepareExpense({
      expenseId: 'EX-LIVE-01', allocationId: allocation.id, amount, receiptHash: digest,
      allocations: [allocation], expenses: [],
    })).toThrow()
  })

  it('rejects an expense ID already present in refreshed records', () => {
    expect(() => prepareExpense({
      expenseId: existingExpense.id, allocationId: allocation.id, amount: '1', receiptHash: digest,
      allocations: [allocation], expenses: [existingExpense],
    })).toThrow('already exists')
  })

  it('generates canonical short unique IDs from supplied entropy', () => {
    expect(generateExpenseId(1_700_000_000_000, 123)).toMatch(/^EX-[A-Z0-9]+-[A-Z0-9]+$/)
    expect(generateExpenseId(1_700_000_000_000, 123).length).toBeLessThanOrEqual(31)
  })
})

describe('expense submission lifecycle', () => {
  it('prevents a duplicate on-chain ID before requesting the wallet', async () => {
    const api = gateway({ before: 'exists' })
    const result = await submitPreparedExpense(api, prepared, vi.fn())
    expect(result.status).toBe('failed')
    expect(api.submitExpense).not.toHaveBeenCalled()
  })

  it('does not request a transaction when the duplicate check is uncertain', async () => {
    const api = gateway({ before: 'unknown' })
    expect((await submitPreparedExpense(api, prepared, vi.fn())).status).toBe('uncertain')
    expect(api.submitExpense).not.toHaveBeenCalled()
  })

  it('reports wallet rejection and retains retry eligibility', async () => {
    const updates: SubmissionUpdate[] = []
    const result = await submitPreparedExpense(gateway({ submitError: { code: 4001 } }), prepared, (state) => updates.push(state))
    expect(result.status).toBe('rejected')
    expect(updates.map((item) => item.status)).toEqual(['awaiting-wallet', 'rejected'])
  })

  it('reports a wallet submission failure separately from rejection', async () => {
    const result = await submitPreparedExpense(gateway({ submitError: new Error('estimate reverted') }), prepared, vi.fn())
    expect(result.status).toBe('failed')
  })

  it('reports a mined revert as failed', async () => {
    const result = await submitPreparedExpense(gateway({ waitStatus: 0 }), prepared, vi.fn())
    expect(result).toMatchObject({ status: 'failed', transactionHash: expect.any(String) })
  })

  it('recovers an uncertain receipt wait when the expense now exists', async () => {
    const refreshed = vi.fn(async () => undefined)
    const result = await submitPreparedExpense(
      gateway({ waitError: true, after: 'exists' }), prepared, vi.fn(), refreshed,
    )
    expect(result).toMatchObject({ status: 'confirmed', recovered: true })
    expect(refreshed).toHaveBeenCalledOnce()
  })

  it('keeps an interrupted transaction uncertain when the record cannot be proven', async () => {
    const result = await submitPreparedExpense(gateway({ waitError: true, after: 'unknown' }), prepared, vi.fn())
    expect(result.status).toBe('uncertain')
  })

  it('confirms, refreshes records, and exposes the full lifecycle', async () => {
    const updates: SubmissionUpdate[] = []
    const refreshed = vi.fn(async () => undefined)
    const result = await submitPreparedExpense(gateway(), prepared, (state) => updates.push(state), refreshed)
    expect(result.status).toBe('confirmed')
    expect(updates.map((item) => item.status)).toEqual(['awaiting-wallet', 'pending', 'confirmed'])
    expect(refreshed).toHaveBeenCalledOnce()
  })

  it('preserves the confirmed hash when the subsequent data refresh fails', async () => {
    const result = await submitPreparedExpense(gateway(), prepared, vi.fn(), async () => false)
    expect(result).toMatchObject({ status: 'confirmed', refreshed: false, transactionHash: expect.any(String) })
  })

  it('makes wallet changes explicit without losing a pending hash', () => {
    expect(expenseStateAfterWalletChange({ status: 'awaiting-wallet' })).toMatchObject({ status: 'failed' })
    expect(expenseStateAfterWalletChange({ status: 'pending', transactionHash: '0xabc' })).toEqual({
      status: 'uncertain',
      transactionHash: '0xabc',
      message: expect.stringContaining('changed'),
    })
    const confirmed: SubmissionUpdate = { status: 'confirmed', transactionHash: '0xabc', recovered: false, refreshed: true }
    expect(expenseStateAfterWalletChange(confirmed)).toBe(confirmed)
  })

  it('blocks a second click while the first asynchronous submission is active', async () => {
    const guard = createSubmissionGuard()
    let release!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    const task = vi.fn(async () => pending)
    const first = guard.run(task)
    const second = await guard.run(task)
    expect(second).toBeUndefined()
    expect(task).toHaveBeenCalledOnce()
    release()
    await first
    expect(guard.busy).toBe(false)
  })
})
