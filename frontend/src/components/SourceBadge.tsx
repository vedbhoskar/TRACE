import type { ProofData } from '../chainTypes'

interface SourceBadgeProps {
  data: ProofData
  onRefresh: () => void
}

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

export function SourceBadge({ data, onRefresh }: SourceBadgeProps) {
  const isLive = data.source.mode === 'live'
  return (
    <aside className={`source-badge ${isLive ? 'source-live' : 'source-snapshot'}`}>
      <div>
        <span className="source-dot" aria-hidden="true" />
        <strong>
          {isLive
            ? `Testnet · synced at block ${data.source.syncedBlock.toLocaleString('en-IN')}`
            : `Cached snapshot · block ${data.source.syncedBlock.toLocaleString('en-IN')} · not freshly checked`}
        </strong>
        <span>Ethereum Sepolia · chain {data.chainId}</span>
      </div>
      <div className="source-actions">
        <a
          href={`${data.explorerBaseUrl}/address/${data.contractAddress}`}
          target="_blank"
          rel="noreferrer"
        >
          Contract {shortAddress(data.contractAddress)} ↗
        </a>
        <button type="button" className="text-button" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </aside>
  )
}
