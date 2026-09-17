import type { ChainAllocation, ChainExpense } from '../chainTypes'
import { canonicalizeId } from './ids'
import { parseInrToPaise } from './money'
import type { ExpenseGateway } from './wallet'

export interface PreparedExpense {
  expenseId: string
  allocationId: string
  amountPaise: bigint
  receiptHash: `0x${string}`
}

export type SubmissionUpdate =
  | { status: 'awaiting-wallet' }
  | { status: 'pending'; transactionHash: string }
  | { status: 'confirmed'; transactionHash: string; recovered: boolean; refreshed: boolean }
  | { status: 'rejected'; message: string }
  | { status: 'failed'; transactionHash?: string; message: string }
  | { status: 'uncertain'; transactionHash?: string; message: string }

export interface SubmissionGuard {
  readonly busy: boolean
  run<T>(task: () => Promise<T>): Promise<T | undefined>
}

export function createSubmissionGuard(): SubmissionGuard {
  let busy = false
  return {
    get busy() { return busy },
    async run(task) {
      if (busy) return undefined
      busy = true
      try {
        return await task()
      } finally {
        busy = false
      }
    },
  }
}

export function expenseStateAfterWalletChange(state: SubmissionUpdate | null): SubmissionUpdate | null {
  if (state?.status === 'awaiting-wallet') {
    return { status: 'failed', message: 'The wallet account or network changed before a transaction hash was received. Your form has been preserved.' }
  }
  if (state?.status === 'pending') {
    return { status: 'uncertain', transactionHash: state.transactionHash, message: 'The wallet account or network changed while confirmation was pending. Check this transaction before retrying.' }
  }
  return state
}

export function resolveAllocationId(
  currentId: string,
  availableIds: readonly string[],
  preserveCurrent: boolean,
): string {
  if (preserveCurrent || availableIds.includes(currentId)) return currentId
  return availableIds[0] ?? ''
}

export function generateExpenseId(now = Date.now(), random = crypto.getRandomValues(new Uint32Array(1))[0]): string {
  return canonicalizeId(`EX-${now.toString(36)}-${random.toString(36)}`)
}

export function prepareExpense(input: {
  expenseId: string
  allocationId: string
  amount: string
  receiptHash: string | null
  allocations: readonly ChainAllocation[]
  expenses: readonly ChainExpense[]
}): PreparedExpense {
  const expenseId = canonicalizeId(input.expenseId)
  if (input.expenses.some((expense) => expense.id === expenseId)) {
    throw new Error('This expense ID already exists. Generate a new ID.')
  }
  const allocation = input.allocations.find((candidate) => candidate.id === input.allocationId)
  if (!allocation) throw new Error('Select a known allocation')
  const remaining = allocation.amountPaise - allocation.claimedPaise
  const amountPaise = parseInrToPaise(input.amount)
  if (amountPaise > remaining) {
    throw new Error(`Amount exceeds the allocation's remaining capacity`)
  }
  if (!input.receiptHash || !/^0x[0-9a-f]{64}$/i.test(input.receiptHash) || /^0x0{64}$/i.test(input.receiptHash)) {
    throw new Error('Select and hash a valid receipt file')
  }
  return {
    expenseId,
    allocationId: allocation.id,
    amountPaise,
    receiptHash: input.receiptHash as `0x${string}`,
  }
}

function isRejected(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  return error.code === 4001 || error.code === 'ACTION_REJECTED'
}

export async function submitPreparedExpense(
  gateway: ExpenseGateway,
  expense: PreparedExpense,
  update: (state: SubmissionUpdate) => void,
  afterConfirmed: () => Promise<boolean | void> = async () => undefined,
): Promise<SubmissionUpdate> {
  const before = await gateway.checkExpense(expense.expenseId)
  if (before === 'exists') {
    const result: SubmissionUpdate = { status: 'failed', message: 'This expense ID is already recorded.' }
    update(result)
    return result
  }
  if (before === 'unknown') {
    const result: SubmissionUpdate = { status: 'uncertain', message: 'The expense ID could not be checked. No transaction was requested.' }
    update(result)
    return result
  }

  update({ status: 'awaiting-wallet' })
  let transaction: Awaited<ReturnType<ExpenseGateway['submitExpense']>>
  try {
    transaction = await gateway.submitExpense(expense)
  } catch (error) {
    const result: SubmissionUpdate = isRejected(error)
      ? { status: 'rejected', message: 'The wallet request was rejected. Your form has been preserved.' }
      : { status: 'failed', message: 'The wallet could not submit the transaction. Your form has been preserved.' }
    update(result)
    return result
  }

  update({ status: 'pending', transactionHash: transaction.hash })
  try {
    const receipt = await transaction.wait()
    if (!receipt || receipt.status !== 1) {
      const result: SubmissionUpdate = {
        status: 'failed',
        transactionHash: transaction.hash,
        message: 'The transaction was mined but did not succeed.',
      }
      update(result)
      return result
    }
    let refreshed = false
    try { refreshed = (await afterConfirmed()) !== false } catch { refreshed = false }
    const result: SubmissionUpdate = { status: 'confirmed', transactionHash: transaction.hash, recovered: false, refreshed }
    update(result)
    return result
  } catch {
    const after = await gateway.checkExpense(expense.expenseId)
    if (after === 'exists') {
      let refreshed = false
      try { refreshed = (await afterConfirmed()) !== false } catch { refreshed = false }
      const result: SubmissionUpdate = { status: 'confirmed', transactionHash: transaction.hash, recovered: true, refreshed }
      update(result)
      return result
    }
    const result: SubmissionUpdate = {
      status: 'uncertain',
      transactionHash: transaction.hash,
      message: after === 'missing'
        ? 'Confirmation was interrupted and the expense is not recorded yet. Check the transaction before retrying.'
        : 'Confirmation was interrupted. Check the transaction and expense before retrying.',
    }
    update(result)
    return result
  }
}
