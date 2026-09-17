import type { ChainReference } from '../chainTypes'
import { formatTimestamp, shortHex } from '../lib/display'

interface RecordMetaProps {
  address: string
  timestamp: number | null
  chain: ChainReference
  actorLabel: string
}

export function RecordMeta({ address, timestamp, chain, actorLabel }: RecordMetaProps) {
  return (
    <dl className="record-meta">
      <div>
        <dt>{actorLabel}</dt>
        <dd title={address}>{shortHex(address)}</dd>
      </div>
      <div>
        <dt>Recorded</dt>
        <dd>{formatTimestamp(timestamp)}</dd>
      </div>
      <div>
        <dt>Chain reference</dt>
        <dd>
          <a href={chain.explorerUrl} target="_blank" rel="noreferrer">
            Block {chain.blockNumber.toLocaleString('en-IN')} · {shortHex(chain.transactionHash)} ↗
          </a>
        </dd>
      </div>
    </dl>
  )
}
