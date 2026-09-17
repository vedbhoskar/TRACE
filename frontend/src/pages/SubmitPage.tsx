import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { ProofData } from '../chainTypes'
import { useWallet } from '../hooks/useWallet'
import {
  generateExpenseId,
  prepareExpense,
  createSubmissionGuard,
  submitPreparedExpense,
  type SubmissionUpdate,
} from '../lib/expenseSubmission'
import { hashReceiptFile, MAX_RECEIPT_BYTES } from '../lib/hashFile'
import { formatPaise } from '../lib/money'
import { traceHref } from '../lib/route'
import { walletConfig } from '../lib/wallet'

interface SubmitPageProps {
  data: ProofData
  onRefresh: () => Promise<void>
}

type HashState =
  | { status: 'idle'; fileName: null; digest: null; error: null }
  | { status: 'hashing'; fileName: string; digest: null; error: null }
  | { status: 'ready'; fileName: string; digest: `0x${string}`; error: null }
  | { status: 'error'; fileName: string | null; digest: null; error: string }

const initialHash: HashState = { status: 'idle', fileName: null, digest: null, error: null }

function shortAddress(address: string | null): string {
  return address ? `${address.slice(0, 8)}…${address.slice(-6)}` : 'Not connected'
}

function statusCopy(state: SubmissionUpdate | null): { title: string; body: string; tone: string } | null {
  if (!state) return null
  if (state.status === 'awaiting-wallet') return { title: 'Awaiting wallet approval', body: 'Review the exact claim in your wallet. No transaction hash exists yet.', tone: 'pending' }
  if (state.status === 'pending') return { title: 'Transaction pending', body: 'The claim was broadcast and is waiting for a successful receipt.', tone: 'pending' }
  if (state.status === 'confirmed') return { title: 'Claim confirmed', body: state.recovered ? 'The receipt wait was interrupted, but the expense was found on-chain.' : 'The successful receipt was mined and live records were refreshed.', tone: 'success' }
  if (state.status === 'rejected') return { title: 'Wallet request rejected', body: state.message, tone: 'warning' }
  if (state.status === 'uncertain') return { title: 'Transaction status uncertain', body: state.message, tone: 'warning' }
  return { title: 'Submission failed', body: state.message, tone: 'error' }
}

export function SubmitPage({ data, onRefresh }: SubmitPageProps) {
  const wallet = useWallet()
  const live = data.source.mode === 'live'
  const availableAllocations = data.allocations.filter((item) => item.amountPaise > item.claimedPaise)
  const [allocationId, setAllocationId] = useState(availableAllocations[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [expenseId, setExpenseId] = useState(() => generateExpenseId())
  const [description, setDescription] = useState('')
  const [hash, setHash] = useState<HashState>(initialHash)
  const [submission, setSubmission] = useState<SubmissionUpdate | null>(null)
  const submissionGuard = useRef(createSubmissionGuard())
  const hashRequest = useRef(0)
  const previousWalletRevision = useRef(wallet.revision)

  useEffect(() => {
    if (previousWalletRevision.current !== wallet.revision) {
      previousWalletRevision.current = wallet.revision
      setSubmission(null)
    }
  }, [wallet.revision])

  const allocation = data.allocations.find((item) => item.id === allocationId)
  const remaining = allocation ? allocation.amountPaise - allocation.claimedPaise : 0n
  const prepared = useMemo(() => {
    try {
      return {
        value: prepareExpense({
          expenseId,
          allocationId,
          amount,
          receiptHash: hash.digest,
          allocations: data.allocations,
          expenses: data.expenses,
        }),
        error: null,
      }
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : 'Claim details are invalid' }
    }
  }, [allocationId, amount, data.allocations, data.expenses, expenseId, hash.digest])

  const canWrite = live && wallet.connected && wallet.correctNetwork && wallet.authorizedNgo
  const busy = submission?.status === 'awaiting-wallet' || submission?.status === 'pending'
  const transactionHash = submission && 'transactionHash' in submission ? submission.transactionHash : undefined
  const displayStatus = statusCopy(submission)

  async function chooseReceipt(file: File | undefined) {
    const request = ++hashRequest.current
    setSubmission(null)
    if (!file) {
      setHash(initialHash)
      return
    }
    setHash({ status: 'hashing', fileName: file.name, digest: null, error: null })
    try {
      const digest = await hashReceiptFile(file)
      if (request === hashRequest.current) {
        setHash({ status: 'ready', fileName: file.name, digest, error: null })
      }
    } catch (error) {
      if (request === hashRequest.current) {
        setHash({
          status: 'error',
          fileName: file.name,
          digest: null,
          error: error instanceof Error ? error.message : 'Receipt could not be hashed',
        })
      }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!prepared.value || !canWrite || !wallet.provider) return
    setSubmission(null)
    await submissionGuard.current.run(async () => {
      try {
        const { createExpenseGateway } = await import('../lib/walletWriter')
        const gateway = await createExpenseGateway(wallet.provider!)
        await submitPreparedExpense(gateway, prepared.value!, setSubmission, onRefresh)
      } catch {
        setSubmission({ status: 'failed', message: 'The wallet adapter could not prepare this transaction. Your form has been preserved.' })
      }
    })
  }

  function resetForm() {
    setExpenseId(generateExpenseId())
    setAmount('')
    setDescription('')
    setHash(initialHash)
    setSubmission(null)
  }

  return (
    <section className="workspace-page">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">NGO workspace</p>
          <h1>Record an expense claim</h1>
          <p>Hash a receipt locally, review the exact paise amount, then authorize one public Sepolia transaction.</p>
        </div>
        <div className="wallet-card" aria-live="polite">
          <span>Connected wallet</span>
          <strong>{shortAddress(wallet.account)}</strong>
          <small>Expected NGO: {shortAddress(walletConfig.ngoAddress)}</small>
          <small>Network: {wallet.chainId ?? 'Not available'} · Sepolia: {walletConfig.chainId}</small>
          {!wallet.connected && wallet.availability === 'available' && (
            <button type="button" onClick={() => void wallet.connect()} disabled={wallet.status === 'connecting'}>
              {wallet.status === 'connecting' ? 'Connecting…' : 'Connect wallet'}
            </button>
          )}
        </div>
      </div>

      {!live && <div className="workspace-notice warning-notice"><strong>Writes disabled.</strong> Cached snapshot data is not a fresh chain source.</div>}
      {wallet.availability === 'unavailable' && <div className="workspace-notice warning-notice"><strong>No injected wallet found.</strong> Install or enable a browser wallet to submit.</div>}
      {wallet.error && <div className="workspace-notice error-notice" role="alert">{wallet.error}</div>}
      {wallet.connected && !wallet.correctNetwork && <div className="workspace-notice warning-notice"><strong>Wrong network.</strong> Switch the wallet to Sepolia chain {walletConfig.chainId}.</div>}
      {wallet.connected && wallet.correctNetwork && !wallet.authorizedNgo && <div className="workspace-notice error-notice"><strong>Unauthorized account.</strong> Only the configured NGO wallet can submit.</div>}

      <form className="submission-layout" onSubmit={(event) => void submit(event)}>
        <div className="submission-form panel-card">
          <div className="section-heading"><span>01</span><div><h2>Claim details</h2><p>Allocation capacity is reconstructed from confirmed records.</p></div></div>
          <label>
            Allocation
            <select value={allocationId} onChange={(event) => { setAllocationId(event.target.value); setSubmission(null) }} disabled={busy}>
              {availableAllocations.map((item) => (
                <option key={item.id} value={item.id}>{item.id} · {formatPaise(item.amountPaise - item.claimedPaise)} remaining</option>
              ))}
            </select>
          </label>
          <div className="capacity-row"><span>Remaining capacity</span><strong>{formatPaise(remaining, true)}</strong></div>
          <label>
            Amount in INR
            <input inputMode="decimal" placeholder="1200.00" value={amount} onChange={(event) => { setAmount(event.target.value); setSubmission(null) }} disabled={busy} />
          </label>
          <label>
            Expense ID
            <div className="inline-field">
              <input value={expenseId} onChange={(event) => { setExpenseId(event.target.value); setSubmission(null) }} disabled={busy} />
              <button type="button" className="secondary-button" onClick={() => setExpenseId(generateExpenseId())} disabled={busy}>Regenerate</button>
            </div>
          </label>
          <label>
            Local description <small>(not stored on-chain)</small>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional note for this browser session" disabled={busy} />
          </label>

          <div className="section-heading"><span>02</span><div><h2>Receipt fingerprint</h2><p>The selected bytes stay in this browser. Maximum {Math.round(MAX_RECEIPT_BYTES / 1024 / 1024)} MB.</p></div></div>
          <label className="file-choice">
            <span>{hash.fileName ?? 'Choose receipt file'}</span>
            <input type="file" onChange={(event) => void chooseReceipt(event.target.files?.[0])} disabled={busy} />
          </label>
          {hash.status === 'hashing' && <p className="field-status">Hashing exact file bytes…</p>}
          {hash.status === 'error' && <p className="field-error" role="alert">{hash.error}</p>}
          {hash.status === 'ready' && <div className="digest-box"><span>SHA-256 digest</span><code>{hash.digest}</code></div>}
        </div>

        <aside className="confirmation-card panel-card">
          <p className="eyebrow">Final confirmation</p>
          <h2>Review before signing</h2>
          <dl>
            <div><dt>Expense ID</dt><dd>{expenseId || '—'}</dd></div>
            <div><dt>Allocation</dt><dd>{allocationId || '—'}</dd></div>
            <div><dt>Amount</dt><dd>{prepared.value ? formatPaise(prepared.value.amountPaise, true) : amount || '—'}</dd></div>
            <div><dt>Receipt</dt><dd>{hash.fileName ?? 'Not selected'}</dd></div>
            <div><dt>Signer</dt><dd>{shortAddress(wallet.account)}</dd></div>
            <div><dt>Contract</dt><dd>{shortAddress(walletConfig.contractAddress)}</dd></div>
          </dl>
          {prepared.error && <p className="field-error">{prepared.error}</p>}
          <button className="submit-claim" type="submit" disabled={!prepared.value || !canWrite || busy}>
            {busy ? 'Submission in progress…' : 'Submit claim'}
          </button>
          <small>A wallet signature records the ID, allocation, integer-paise amount, and digest. It does not upload the receipt.</small>

          {displayStatus && (
            <div className={`transaction-state ${displayStatus.tone}`} role="status">
              <strong>{displayStatus.title}</strong>
              <p>{displayStatus.body}</p>
              {transactionHash && <a href={`${data.explorerBaseUrl}/tx/${transactionHash}`} target="_blank" rel="noreferrer">View transaction ↗</a>}
              {submission?.status === 'confirmed' && allocation && (
                <div className="confirmed-actions">
                  <a href={traceHref(allocation.donationId)}>Open new expense trail</a>
                  <button type="button" className="text-button" onClick={resetForm}>Prepare another claim</button>
                </div>
              )}
              {submission?.status === 'uncertain' && <button type="button" className="text-button" onClick={() => setSubmission(null)}>Re-check before retry</button>}
            </div>
          )}
        </aside>
      </form>
    </section>
  )
}
