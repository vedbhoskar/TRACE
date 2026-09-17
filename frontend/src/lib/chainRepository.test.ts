import { Interface, encodeBytes32String } from 'ethers'
import { describe, expect, it, vi } from 'vitest'
import abi from '../generated/ProofRegistry.abi.json'
import {
  readLogsInChunks,
  reconstructProofData,
  type ChainLog,
  type LogReader,
} from './chainRepository'

const registryInterface = new Interface(abi)
const ngo = '0xcd03b48ffEE227D7796918b091f593292e71d908'
const reviewer = '0x498E0503cc00EDeeE00a054C99c69894b13e4ae0'
const config = {
  chainId: 11_155_111,
  contractAddress: '0x8b123800F17CbeBCE3546678A70a0b5414b779e3',
  deploymentBlock: 100,
  campaignId: encodeBytes32String('CAM-FLOOD-01'),
  ngoAddress: ngo,
  reviewerAddress: reviewer,
  explorerBaseUrl: 'https://sepolia.etherscan.io',
}

function eventLog(
  name: string,
  values: readonly unknown[],
  blockNumber: number,
  transactionIndex = 0,
  index = 0,
): ChainLog {
  const event = registryInterface.getEvent(name)
  if (!event) throw new Error(`Missing ABI event ${name}`)
  const encoded = registryInterface.encodeEventLog(event, values)
  return {
    data: encoded.data,
    topics: encoded.topics,
    transactionHash: `0x${blockNumber.toString(16).padStart(64, '0')}`,
    blockNumber,
    transactionIndex,
    index,
  }
}

describe('chain repository reconstruction', () => {
  it('rebuilds parents, balances, latest review, history, and ordered timeline', () => {
    const logs = [
      eventLog(
        'DonationRecorded',
        [encodeBytes32String('DON-8F42A1'), 1_000_000n, ngo, 1_000n],
        101,
      ),
      eventLog(
        'AllocationRecorded',
        [
          encodeBytes32String('AL-FOOD-01'),
          encodeBytes32String('DON-8F42A1'),
          600_000n,
          0,
          ngo,
          1_010n,
        ],
        102,
      ),
      eventLog(
        'ExpenseSubmitted',
        [
          encodeBytes32String('EX-FOOD-01'),
          encodeBytes32String('AL-FOOD-01'),
          480_000n,
          `0x${'11'.repeat(32)}`,
          ngo,
          1_020n,
        ],
        103,
      ),
      eventLog(
        'ExpenseReviewed',
        [encodeBytes32String('EX-FOOD-01'), 2, 3, reviewer, 1_030n, 1n],
        104,
      ),
      eventLog(
        'ExpenseReviewed',
        [encodeBytes32String('EX-FOOD-01'), 1, 1, reviewer, 1_040n, 2n],
        105,
      ),
    ]

    const data = reconstructProofData(logs.reverse(), config, 110)

    expect(data.source).toEqual({ mode: 'live', syncedBlock: 110 })
    expect(data.donations[0].allocatedPaise).toBe(600_000n)
    expect(data.allocations[0].claimedPaise).toBe(480_000n)
    expect(data.expenses[0].latestReview).toBe('attested')
    expect(data.expenses[0].reviewHistory.map((item) => item.decision)).toEqual([
      'flagged',
      'attested',
    ])
    expect(data.timeline.map((item) => item.chain.blockNumber)).toEqual([
      101, 102, 103, 104, 105,
    ])
    expect(data.timeline[0].chain.explorerUrl).toContain('/tx/0x')
  })

  it('rejects a child event whose confirmed parent is absent', () => {
    const orphan = eventLog(
      'AllocationRecorded',
      [
        encodeBytes32String('AL-FOOD-01'),
        encodeBytes32String('DON-MISSING'),
        1n,
        0,
        ngo,
        1_000n,
      ],
      101,
    )
    expect(() => reconstructProofData([orphan], config, 101)).toThrow(
      'unknown donation',
    )
  })
})

describe('bounded event reads', () => {
  it('shrinks rejected ranges, advances without gaps, and restores larger chunks', async () => {
    const accepted: Array<[number, number]> = []
    const reader: LogReader = {
      getLogs: vi.fn(async ({ fromBlock, toBlock }) => {
        if (toBlock - fromBlock + 1 > 10) throw new Error('range too wide')
        accepted.push([fromBlock, toBlock])
        return []
      }),
    }

    await expect(readLogsInChunks(reader, config.contractAddress, 100, 124, 40, 10))
      .resolves.toEqual([])
    expect(accepted).toEqual([
      [100, 109],
      [110, 119],
      [120, 124],
    ])
  })

  it('rejects invalid chunk configuration', async () => {
    const reader: LogReader = { getLogs: async () => [] }
    await expect(
      readLogsInChunks(reader, config.contractAddress, 1, 2, 5, 10),
    ).rejects.toThrow('Invalid event query chunk sizes')
  })
})
