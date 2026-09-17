import { getAddress, type Eip1193Provider } from 'ethers'
import deploymentJson from '../generated/deployment.json'

interface DeploymentConfig {
  chainId: number
  contractAddress: string
  ngoAddress: string
}

export interface InjectedProvider extends Eip1193Provider {
  on?: (event: 'accountsChanged' | 'chainChanged', listener: (...args: unknown[]) => void) => void
  removeListener?: (event: 'accountsChanged' | 'chainChanged', listener: (...args: unknown[]) => void) => void
}

export interface WalletSnapshot {
  availability: 'unavailable' | 'available'
  connected: boolean
  account: string | null
  chainId: number | null
  correctNetwork: boolean
  authorizedNgo: boolean
}

export interface ExpenseTransaction {
  hash: string
  wait(): Promise<{ status: number | null } | null>
}

export interface ExpenseGateway {
  checkExpense(expenseId: string): Promise<'exists' | 'missing' | 'unknown'>
  submitExpense(input: {
    expenseId: string
    allocationId: string
    amountPaise: bigint
    receiptHash: `0x${string}`
  }): Promise<ExpenseTransaction>
}

const deployment = deploymentJson as DeploymentConfig

function parseChainId(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, value.startsWith('0x') ? 16 : 10)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function firstAccount(value: unknown): string | null {
  if (!Array.isArray(value) || typeof value[0] !== 'string') return null
  try {
    return getAddress(value[0])
  } catch {
    return null
  }
}

export function unavailableWallet(): WalletSnapshot {
  return {
    availability: 'unavailable',
    connected: false,
    account: null,
    chainId: null,
    correctNetwork: false,
    authorizedNgo: false,
  }
}

export async function readWallet(
  provider: InjectedProvider | undefined,
  requestAccess = false,
): Promise<WalletSnapshot> {
  if (!provider) return unavailableWallet()
  const [accounts, chain] = await Promise.all([
    provider.request({ method: requestAccess ? 'eth_requestAccounts' : 'eth_accounts' }),
    provider.request({ method: 'eth_chainId' }),
  ])
  const account = firstAccount(accounts)
  const chainId = parseChainId(chain)
  return {
    availability: 'available',
    connected: account !== null,
    account,
    chainId,
    correctNetwork: chainId === deployment.chainId,
    authorizedNgo: account !== null && getAddress(account) === getAddress(deployment.ngoAddress),
  }
}

export function watchWallet(provider: InjectedProvider, onChange: () => void): () => void {
  const listener = () => onChange()
  provider.on?.('accountsChanged', listener)
  provider.on?.('chainChanged', listener)
  return () => {
    provider.removeListener?.('accountsChanged', listener)
    provider.removeListener?.('chainChanged', listener)
  }
}

export function assertNgoWallet(snapshot: WalletSnapshot): void {
  if (!snapshot.connected) throw new Error('Connect the configured NGO wallet before submitting')
  if (!snapshot.correctNetwork) throw new Error(`Switch the wallet to Sepolia chain ${deployment.chainId}`)
  if (!snapshot.authorizedNgo) throw new Error('Only the configured NGO wallet can submit expenses')
}

export function injectedProvider(): InjectedProvider | undefined {
  return (window as typeof window & { ethereum?: InjectedProvider }).ethereum
}

export const walletConfig = {
  chainId: deployment.chainId,
  ngoAddress: getAddress(deployment.ngoAddress),
  contractAddress: getAddress(deployment.contractAddress),
}
