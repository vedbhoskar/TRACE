import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { HashVerifier } from '../components/HashVerifier'
import type { ProofData } from '../chainTypes'
import { reasonLabel, reviewLabels } from '../data/demoLabels'
import { useWallet } from '../hooks/useWallet'
import { createSubmissionGuard } from '../lib/expenseSubmission'
import { formatTimestamp, shortHex } from '../lib/display'
import { formatPaise } from '../lib/money'
import {
  prepareReview,
  reviewStateAfterWalletChange,
  submitPreparedReview,
  type ReviewUpdate,
} from '../lib/reviewSubmission'
import { walletConfig } from '../lib/wallet'

interface ReviewPageProps {
  data: ProofData
  onRefresh: () => Promise<boolean>
}

const reasonOptions = [
  ['DOCUMENT_REVIEWED', 'Document reviewed'],
  ['INSUFFICIENT_EVIDENCE', 'Insufficient evidence'],
  ['AMOUNT_DISCREPANCY', 'Amount discrepancy'],
  ['OTHER', 'Other'],
] as const

function shortAddress(address: string | null): string {
  return address ? `${address.slice(0, 8)}…${address.slice(-6)}` : 'Not connected'
}

function statusCopy(state: ReviewUpdate | null) {
  if (!state) return null
  if (state.status === 'awaiting-wallet') return { title: 'Awaiting wallet approval', body: 'Review the exact reviewer decision in your wallet.', tone: 'pending' }
  if (state.status === 'pending') return { title: 'Review pending', body: 'The decision was broadcast and is waiting for a successful receipt.', tone: 'pending' }
  if (state.status === 'confirmed') return {
    title: 'Decision confirmed',
    body: state.refreshed
      ? state.recovered ? 'The receipt wait was interrupted, but the requested review is now on-chain and history was refreshed.' : 'The decision was mined and review history was refreshed.'
      : 'The decision is confirmed. Public review history could not be refreshed yet; the transaction link is preserved below.',
    tone: state.refreshed ? 'success' : 'warning',
  }
  if (state.status === 'rejected') return { title: 'Wallet request rejected', body: state.message, tone: 'warning' }
  if (state.status === 'uncertain') return { title: 'Review status uncertain', body: state.message, tone: 'warning' }
  return { title: 'Review failed', body: state.message, tone: 'error' }
}

export function ReviewPage({ data, onRefresh }: ReviewPageProps) {
  const wallet = useWallet()
  const attention = data.expenses.filter((expense) => expense.latestReview !== 'attested')
  const [expenseId, setExpenseId] = useState(attention[0]?.id ?? '')
  const [decision, setDecision] = useState('')
  const [reason, setReason] = useState('')
  const [reviewState, setReviewState] = useState<ReviewUpdate | null>(null)
  const guard = useRef(createSubmissionGuard())
  const previousWalletRevision = useRef(wallet.revision)
  const currentWalletRevision = useRef(wallet.revision)

  useEffect(() => {
    currentWalletRevision.current = wallet.revision
    if (previousWalletRevision.current !== wallet.revision) {
      previousWalletRevision.current = wallet.revision
      setReviewState(reviewStateAfterWalletChange)
    }
  }, [wallet.revision])

  const expense = data.expenses.find((item) => item.id === expenseId)
  const allocation = data.allocations.find((item) => item.id === expense?.allocationId)
  const prepared = useMemo(() => {
    try {
      return { value: prepareReview({ expense, decision, reason }), error: null }
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : 'Review details are invalid' }
    }
  }, [decision, expense, reason])

  const live = data.source.mode === 'live'
  const canWrite = live && wallet.connected && wallet.correctNetwork && wallet.authorizedReviewer
  const busy = reviewState?.status === 'awaiting-wallet' || reviewState?.status === 'pending'
  const displayStatus = statusCopy(reviewState)
  const transactionHash = reviewState && 'transactionHash' in reviewState ? reviewState.transactionHash : undefined

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!prepared.value || !canWrite || !wallet.provider) return
    setReviewState(null)
    await guard.current.run(async () => {
      const submittedWalletRevision = wallet.revision
      const update = (state: ReviewUpdate) => {
        if (currentWalletRevision.current === submittedWalletRevision) setReviewState(state)
      }
      try {
        const { createReviewGateway } = await import('../lib/reviewWriter')
        const gateway = await createReviewGateway(wallet.provider!)
        await submitPreparedReview(gateway, prepared.value!, update, onRefresh)
      } catch {
        update({ status: 'failed', message: 'The reviewer wallet adapter could not prepare this transaction. Your choices were preserved.' })
      }
    })
  }

  return (
    <section className="workspace-page review-workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Reviewer workspace</p>
          <h1>Record a reviewer decision</h1>
          <p>Inspect a claim and its receipt fingerprint, then preserve an attributed Attested or Flagged decision.</p>
        </div>
        <div className="wallet-card" aria-live="polite">
          <span>Connected wallet</span>
          <strong>{shortAddress(wallet.account)}</strong>
          <small>Expected reviewer: {shortAddress(walletConfig.reviewerAddress)}</small>
          <small>Network: {wallet.chainId ?? 'Not available'} · Sepolia: {walletConfig.chainId}</small>
          {!wallet.connected && wallet.availability === 'available' && (
            <button type="button" onClick={() => void wallet.connect()} disabled={wallet.status === 'connecting'}>
              {wallet.status === 'connecting' ? 'Connecting…' : 'Connect wallet'}
            </button>
          )}
        </div>
      </div>

      {!live && <div className="workspace-notice warning-notice"><strong>Writes disabled.</strong> Cached snapshot data is not a fresh chain source.</div>}
      {wallet.availability === 'unavailable' && <div className="workspace-notice warning-notice"><strong>No injected wallet found.</strong> Install or enable a browser wallet to review.</div>}
      {wallet.error && <div className="workspace-notice error-notice" role="alert">{wallet.error}</div>}
      {wallet.connected && !wallet.correctNetwork && <div className="workspace-notice warning-notice"><strong>Wrong network.</strong> Switch the wallet to Sepolia chain {walletConfig.chainId}.</div>}
      {wallet.connected && wallet.correctNetwork && !wallet.authorizedReviewer && <div className="workspace-notice error-notice"><strong>Unauthorized account.</strong> The NGO wallet and other accounts cannot review.</div>}

      <div className="review-grid">
        <aside className="claim-queue panel-card">
          <div className="section-heading"><span>01</span><div><h2>Needs review</h2><p>Unreviewed and flagged claims</p></div></div>
          {attention.length === 0 ? <p className="empty-copy">No claims currently need attention.</p> : (
            <div className="queue-list">
              {attention.map((item) => (
                <button
                  type="button"
                  className={item.id === expenseId ? 'selected' : ''}
                  key={item.id}
                  onClick={() => { setExpenseId(item.id); setReviewState(null) }}
                  disabled={busy}
                >
                  <span><strong>{item.id}</strong><small>{item.allocationId}</small></span>
                  <span><strong>{formatPaise(item.amountPaise)}</strong><small data-status={item.latestReview}>{reviewLabels[item.latestReview]}</small></span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="review-detail">
          {expense ? (
            <>
              <article className="panel-card review-claim-card">
                <div className="section-heading"><span>02</span><div><h2>Inspect claim</h2><p>Chain-confirmed fields and separate local integrity check</p></div></div>
                <div className="expense-title"><div><span className="claim-label">Expense claim</span><h3>{expense.id}</h3></div><strong>{formatPaise(expense.amountPaise, true)}</strong></div>
                <dl className="review-facts">
                  <div><dt>Allocation</dt><dd>{allocation?.id ?? expense.allocationId}</dd></div>
                  <div><dt>Latest decision</dt><dd data-status={expense.latestReview}>{reviewLabels[expense.latestReview]}</dd></div>
                  <div><dt>Submitted by</dt><dd title={expense.submitter}>{shortHex(expense.submitter)}</dd></div>
                  <div><dt>Receipt digest</dt><dd title={expense.receiptHash}>{shortHex(expense.receiptHash, 12, 10)}</dd></div>
                  <div><dt>Claim transaction</dt><dd><a href={expense.chain.explorerUrl} target="_blank" rel="noreferrer">View on explorer ↗</a></dd></div>
                </dl>
                <HashVerifier expenseId={expense.id} expectedDigest={expense.receiptHash} latestReview={expense.latestReview} source={data.source} />
                <div className="review-history reviewer-history">
                  <strong>Append-only review history</strong>
                  {expense.reviewHistory.length === 0 ? <p>No reviewer decision has been recorded.</p> : (
                    <ol>{expense.reviewHistory.map((item) => (
                      <li key={`${item.chain.transactionHash}-${item.reviewNumber}`}>
                        <span data-status={item.decision}>{reviewLabels[item.decision]}</span>
                        <div><strong>{reasonLabel(item.reasonCode)}</strong><small>{formatTimestamp(item.reviewedAt)} · {shortHex(item.reviewer)}</small></div>
                        <a href={item.chain.explorerUrl} target="_blank" rel="noreferrer">↗</a>
                      </li>
                    ))}</ol>
                  )}
                </div>
              </article>

              <form className="panel-card decision-card" onSubmit={(event) => void submit(event)}>
                <div className="section-heading"><span>03</span><div><h2>Record decision</h2><p>This changes the latest state and preserves prior events.</p></div></div>
                <fieldset disabled={busy}>
                  <legend>Decision</legend>
                  <div className="decision-options">
                    <label className={decision === 'attested' ? 'selected' : ''}><input type="radio" name="decision" value="attested" checked={decision === 'attested'} onChange={(event) => { setDecision(event.target.value); setReviewState(null) }} />✓ Attest</label>
                    <label className={decision === 'flagged' ? 'selected' : ''}><input type="radio" name="decision" value="flagged" checked={decision === 'flagged'} onChange={(event) => { setDecision(event.target.value); setReviewState(null) }} />! Flag</label>
                  </div>
                  <label className="reason-field">Reason code<select value={reason} onChange={(event) => { setReason(event.target.value); setReviewState(null) }}><option value="">Select a reason</option>{reasonOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                </fieldset>

                <div className="review-confirmation">
                  <strong>Final decision summary</strong>
                  <dl>
                    <div><dt>Expense</dt><dd>{expense.id}</dd></div>
                    <div><dt>Amount</dt><dd>{formatPaise(expense.amountPaise, true)}</dd></div>
                    <div><dt>Decision</dt><dd>{prepared.value ? reviewLabels[prepared.value.decision] : decision === 'attested' ? 'Attested' : decision === 'flagged' ? 'Flagged' : '—'}</dd></div>
                    <div><dt>Reason</dt><dd>{reasonOptions.find(([value]) => value === reason)?.[1] ?? '—'}</dd></div>
                    <div><dt>Reviewer</dt><dd>{shortAddress(wallet.account)}</dd></div>
                    <div><dt>Network</dt><dd>Sepolia · {walletConfig.chainId}</dd></div>
                    <div><dt>Contract</dt><dd>{shortAddress(walletConfig.contractAddress)}</dd></div>
                  </dl>
                </div>
                {prepared.error && <p className="field-error">{prepared.error}</p>}
                <button className="submit-claim" type="submit" disabled={!prepared.value || !canWrite || busy}>{busy ? 'Review in progress…' : 'Record reviewer decision'}</button>

                {displayStatus && <div className={`transaction-state ${displayStatus.tone}`} role="status"><strong>{displayStatus.title}</strong><p>{displayStatus.body}</p>{transactionHash && <a href={`${data.explorerBaseUrl}/tx/${transactionHash}`} target="_blank" rel="noreferrer">View transaction ↗</a>}{reviewState?.status === 'uncertain' && <button type="button" className="text-button" onClick={() => setReviewState(null)}>Clear status and re-check on retry</button>}</div>}
              </form>
            </>
          ) : <div className="panel-card empty-copy">Select an available claim to review.</div>}
        </div>
      </div>
    </section>
  )
}
