import {
  Contract,
  Interface,
  JsonRpcProvider,
  getAddress,
  type Log,
} from 'ethers'
import abi from '../generated/ProofRegistry.abi.json'
import deploymentJson from '../generated/deployment.json'
import type {
  ChainAllocation,
  ChainDonation,
  ChainExpense,
  ChainReference,
  ChainReview,
  ProofData,
  TimelineEntry,
} from '../chainTypes'
import type { ReviewStatus } from '../types'
import { bytes32ToId } from './ids'

const DEFAULT_PUBLIC_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'
const INITIAL_LOG_CHUNK_SIZE = 2_000
const MINIMUM_LOG_CHUNK_SIZE = 10

interface DeploymentConfig {
  chainId: number
  contractAddress: string
  deploymentBlock: number
  campaignId: string
  ngoAddress: string
  reviewerAddress: string
  explorerBaseUrl: string
}

export interface ChainLog {
  data: string
  topics: readonly string[]
  transactionHash: string
  blockNumber: number
  transactionIndex: number
  index: number
}

export interface LogReader {
  getLogs(filter: {
    address: string
    fromBlock: number
    toBlock: number
  }): Promise<ChainLog[]>
}

const deployment = deploymentJson as DeploymentConfig
const registryInterface = new Interface(abi)

function publicRpcUrl(): string {
  const configured = import.meta.env.VITE_SEPOLIA_RPC_URL?.trim()
  if (!configured || configured.includes('your-sepolia-rpc.example')) {
    return DEFAULT_PUBLIC_RPC_URL
  }
  return configured
}

function compareLogs(left: ChainLog, right: ChainLog): number {
  return (
    left.blockNumber - right.blockNumber ||
    left.transactionIndex - right.transactionIndex ||
    left.index - right.index
  )
}

export async function readLogsInChunks(
  reader: LogReader,
  address: string,
  fromBlock: number,
  toBlock: number,
  initialChunkSize = INITIAL_LOG_CHUNK_SIZE,
  minimumChunkSize = MINIMUM_LOG_CHUNK_SIZE,
): Promise<ChainLog[]> {
  if (toBlock < fromBlock) return []
  if (initialChunkSize < minimumChunkSize || minimumChunkSize <= 0) {
    throw new Error('Invalid event query chunk sizes')
  }

  const logs: ChainLog[] = []
  let cursor = fromBlock
  let chunkSize = initialChunkSize

  while (cursor <= toBlock) {
    const chunkEnd = Math.min(cursor + chunkSize - 1, toBlock)
    try {
      logs.push(
        ...(await reader.getLogs({
          address,
          fromBlock: cursor,
          toBlock: chunkEnd,
        })),
      )
      cursor = chunkEnd + 1
      chunkSize = Math.min(initialChunkSize, chunkSize * 2)
    } catch (error) {
      if (chunkSize <= minimumChunkSize) throw error
      chunkSize = Math.max(minimumChunkSize, Math.floor(chunkSize / 2))
    }
  }

  return logs.sort(compareLogs)
}

function chainReference(log: ChainLog, explorerBaseUrl: string): ChainReference {
  return {
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    transactionIndex: log.transactionIndex,
    logIndex: log.index,
    explorerUrl: `${explorerBaseUrl}/tx/${log.transactionHash}`,
  }
}

function reviewStatus(code: number): ReviewStatus {
  if (code === 0) return 'unreviewed'
  if (code === 1) return 'attested'
  if (code === 2) return 'flagged'
  throw new Error(`Unsupported review status code ${code}`)
}

function requireUnique<T>(map: Map<string, T>, id: string, kind: string): void {
  if (map.has(id)) throw new Error(`Duplicate ${kind} event for ${id}`)
}

export function reconstructProofData(
  logs: readonly ChainLog[],
  config: DeploymentConfig,
  syncedBlock: number,
): ProofData {
  const donations = new Map<string, ChainDonation>()
  const allocations = new Map<string, ChainAllocation>()
  const expenses = new Map<string, ChainExpense>()
  const timeline: TimelineEntry[] = []

  for (const log of [...logs].sort(compareLogs)) {
    const parsed = registryInterface.parseLog({ data: log.data, topics: [...log.topics] })
    if (parsed === null) continue
    const reference = chainReference(log, config.explorerBaseUrl)

    if (parsed.name === 'DonationRecorded') {
      const id = bytes32ToId(String(parsed.args.donationId))
      requireUnique(donations, id, 'donation')
      const recordedAt = Number(parsed.args.recordedAt)
      donations.set(id, {
        id,
        amountPaise: BigInt(parsed.args.amountPaise),
        allocatedPaise: 0n,
        submitter: getAddress(String(parsed.args.submitter)),
        recordedAt,
        chain: reference,
      })
      timeline.push({ kind: 'donation', recordId: id, timestamp: recordedAt, chain: reference })
      continue
    }

    if (parsed.name === 'AllocationRecorded') {
      const id = bytes32ToId(String(parsed.args.allocationId))
      const donationId = bytes32ToId(String(parsed.args.donationId))
      const donation = donations.get(donationId)
      if (!donation) throw new Error(`Allocation ${id} has unknown donation ${donationId}`)
      requireUnique(allocations, id, 'allocation')
      const amountPaise = BigInt(parsed.args.amountPaise)
      const recordedAt = Number(parsed.args.recordedAt)
      allocations.set(id, {
        id,
        donationId,
        amountPaise,
        claimedPaise: 0n,
        categoryCode: Number(parsed.args.category),
        submitter: getAddress(String(parsed.args.submitter)),
        recordedAt,
        chain: reference,
      })
      donation.allocatedPaise += amountPaise
      timeline.push({ kind: 'allocation', recordId: id, timestamp: recordedAt, chain: reference })
      continue
    }

    if (parsed.name === 'ExpenseSubmitted') {
      const id = bytes32ToId(String(parsed.args.expenseId))
      const allocationId = bytes32ToId(String(parsed.args.allocationId))
      const allocation = allocations.get(allocationId)
      if (!allocation) throw new Error(`Expense ${id} has unknown allocation ${allocationId}`)
      requireUnique(expenses, id, 'expense')
      const amountPaise = BigInt(parsed.args.amountPaise)
      const submittedAt = Number(parsed.args.submittedAt)
      expenses.set(id, {
        id,
        allocationId,
        amountPaise,
        receiptHash: String(parsed.args.receiptHash),
        submitter: getAddress(String(parsed.args.submitter)),
        submittedAt,
        latestReview: 'unreviewed',
        reviewHistory: [],
        chain: reference,
      })
      allocation.claimedPaise += amountPaise
      timeline.push({ kind: 'expense', recordId: id, timestamp: submittedAt, chain: reference })
      continue
    }

    if (parsed.name === 'ExpenseReviewed') {
      const expenseId = bytes32ToId(String(parsed.args.expenseId))
      const expense = expenses.get(expenseId)
      if (!expense) throw new Error(`Review has unknown expense ${expenseId}`)
      const reviewedAt = Number(parsed.args.reviewedAt)
      const review: ChainReview = {
        expenseId,
        decision: reviewStatus(Number(parsed.args.decision)),
        reasonCode: Number(parsed.args.reason),
        reviewer: getAddress(String(parsed.args.reviewer)),
        reviewedAt,
        reviewNumber: BigInt(parsed.args.reviewNumber),
        chain: reference,
      }
      expense.reviewHistory.push(review)
      expense.latestReview = review.decision
      timeline.push({ kind: 'review', recordId: expenseId, timestamp: reviewedAt, chain: reference })
    }
  }

  return {
    campaignId: bytes32ToId(config.campaignId),
    ngoAddress: getAddress(config.ngoAddress),
    reviewerAddress: getAddress(config.reviewerAddress),
    contractAddress: getAddress(config.contractAddress),
    chainId: config.chainId,
    explorerBaseUrl: config.explorerBaseUrl,
    source: { mode: 'live', syncedBlock },
    donations: [...donations.values()],
    allocations: [...allocations.values()],
    expenses: [...expenses.values()],
    timeline,
  }
}

function normalizeLog(log: Log): ChainLog {
  return {
    data: log.data,
    topics: log.topics,
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    transactionIndex: log.transactionIndex,
    index: log.index,
  }
}

export async function loadProofData(): Promise<ProofData> {
  const provider = new JsonRpcProvider(
    publicRpcUrl(),
  )
  const network = await provider.getNetwork()
  if (Number(network.chainId) !== deployment.chainId) {
    throw new Error(`RPC returned unexpected chain ${network.chainId}`)
  }

  const syncedBlock = await provider.getBlockNumber()
  const registry = new Contract(deployment.contractAddress, abi, provider)
  const [campaignId, ngoAddress, reviewerAddress] = await Promise.all([
    registry.campaignId({ blockTag: syncedBlock }) as Promise<string>,
    registry.ngo({ blockTag: syncedBlock }) as Promise<string>,
    registry.auditor({ blockTag: syncedBlock }) as Promise<string>,
  ])

  if (campaignId.toLowerCase() !== deployment.campaignId.toLowerCase()) {
    throw new Error('Contract campaign does not match deployment configuration')
  }
  if (getAddress(ngoAddress) !== getAddress(deployment.ngoAddress)) {
    throw new Error('Contract NGO does not match deployment configuration')
  }
  if (getAddress(reviewerAddress) !== getAddress(deployment.reviewerAddress)) {
    throw new Error('Contract reviewer does not match deployment configuration')
  }

  const rawLogs = await readLogsInChunks(
    {
      async getLogs(filter) {
        return (await provider.getLogs(filter)).map(normalizeLog)
      },
    },
    deployment.contractAddress,
    deployment.deploymentBlock,
    syncedBlock,
  )
  return reconstructProofData(rawLogs, deployment, syncedBlock)
}
