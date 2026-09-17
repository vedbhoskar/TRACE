import { BrowserProvider, Contract } from 'ethers'
import abi from '../generated/ProofRegistry.abi.json'
import deploymentJson from '../generated/deployment.json'
import { idToBytes32 } from './ids'
import type { ReviewGateway } from './reviewSubmission'
import { assertReviewerWallet, readWallet, type ExpenseTransaction, type InjectedProvider } from './wallet'

const deployment = deploymentJson as { contractAddress: string }

export async function createReviewGateway(provider: InjectedProvider): Promise<ReviewGateway> {
  assertReviewerWallet(await readWallet(provider))
  const browserProvider = new BrowserProvider(provider)
  const signer = await browserProvider.getSigner()
  const registry = new Contract(deployment.contractAddress, abi, signer)
  return {
    async checkReview(expenseId) {
      try {
        const expense = await registry.getExpense(idToBytes32(expenseId))
        return {
          decisionCode: Number(expense.latestReviewStatus),
          reasonCode: Number(expense.latestReviewReason),
          reviewCount: BigInt(expense.reviewCount),
        }
      } catch (error) {
        return typeof error === 'object' && error !== null && 'code' in error && error.code === 'CALL_EXCEPTION'
          ? 'missing'
          : 'unknown'
      }
    },
    async submitReview(review) {
      return registry.reviewExpense(
        idToBytes32(review.expenseId),
        review.decisionCode,
        review.reasonCode,
      ) as Promise<ExpenseTransaction>
    },
  }
}
