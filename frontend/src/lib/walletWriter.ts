import { BrowserProvider, Contract } from 'ethers'
import abi from '../generated/ProofRegistry.abi.json'
import deploymentJson from '../generated/deployment.json'
import { idToBytes32 } from './ids'
import { assertNgoWallet, readWallet, type ExpenseGateway, type ExpenseTransaction, type InjectedProvider } from './wallet'

interface DeploymentConfig {
  contractAddress: string
}

const deployment = deploymentJson as DeploymentConfig

function isMissingExpenseError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'CALL_EXCEPTION'
}

export async function createExpenseGateway(provider: InjectedProvider): Promise<ExpenseGateway> {
  assertNgoWallet(await readWallet(provider))
  const browserProvider = new BrowserProvider(provider)
  const signer = await browserProvider.getSigner()
  const registry = new Contract(deployment.contractAddress, abi, signer)
  return {
    async checkExpense(expenseId) {
      try {
        await registry.getExpense(idToBytes32(expenseId))
        return 'exists'
      } catch (error) {
        return isMissingExpenseError(error) ? 'missing' : 'unknown'
      }
    },
    async submitExpense(input) {
      return registry.submitExpense(
        idToBytes32(input.expenseId),
        idToBytes32(input.allocationId),
        input.amountPaise,
        input.receiptHash,
      ) as Promise<ExpenseTransaction>
    },
  }
}
