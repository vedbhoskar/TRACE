import type { ProofData, TimelineKind } from '../chainTypes'
import { DonationSearch } from '../components/DonationSearch'
import { RecordMeta } from '../components/RecordMeta'
import { HashVerifier } from '../components/HashVerifier'
import { categoryLabel, reasonLabel, reviewLabels } from '../data/demoLabels'
import { formatPaise } from '../lib/money'
import { formatTimestamp, shortHex } from '../lib/display'

interface TracePageProps {
  data: ProofData
  donationId: string
}

const timelineLabels: Readonly<Record<TimelineKind, string>> = {
  donation: 'Donation recorded',
  allocation: 'Allocation recorded',
  expense: 'Expense claim submitted',
  review: 'Reviewer decision recorded',
}

export function TracePage({ data, donationId }: TracePageProps) {
  const donation = data.donations.find((item) => item.id === donationId)
  if (!donation) {
    return (
      <section className="state-panel unknown-state">
        <span className="state-icon" aria-hidden="true">?</span>
        <p className="eyebrow">No record found</p>
        <h1>{donationId || 'Unknown donation'}</h1>
        <p>
          Sepolia was checked successfully, but this donation ID is not recorded in the deployed
          ProofRegistry. Check the spelling or search for the canonical demo record.
        </p>
        <DonationSearch initialValue="DON-8F42A1" compact />
        <a className="back-link" href="#/">← Return to campaign</a>
      </section>
    )
  }

  const allocations = data.allocations.filter((item) => item.donationId === donation.id)
  const relevantExpenseIds = new Set(
    data.expenses
      .filter((expense) => allocations.some((item) => item.id === expense.allocationId))
      .map((expense) => expense.id),
  )
  const timeline = data.timeline.filter(
    (entry) =>
      entry.recordId === donation.id ||
      allocations.some((item) => item.id === entry.recordId) ||
      relevantExpenseIds.has(entry.recordId),
  )

  return (
    <>
      <a className="back-link" href="#/">← Campaign overview</a>
      <section className="trace-header">
        <div>
          <p className="eyebrow">Donation trace</p>
          <h1>{donation.id}</h1>
          <p className="hero-copy">
            One confirmed donation record, reconstructed from contract events at a single Sepolia block.
          </p>
        </div>
        <div className="donation-total">
          <span>Recorded amount</span>
          <strong>{formatPaise(donation.amountPaise)}</strong>
          <small>{formatPaise(donation.amountPaise - donation.allocatedPaise)} unallocated</small>
        </div>
      </section>
      <RecordMeta
        address={donation.submitter}
        actorLabel="Recorded by NGO address"
        timestamp={donation.recordedAt}
        chain={donation.chain}
      />

      <section className="trace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Allocation trail</p>
            <h2>Three branches from the recorded donation</h2>
          </div>
          <span className="count-pill">{allocations.length}</span>
        </div>

        <div className="allocation-list">
          {allocations.map((allocation) => {
            const expenses = data.expenses.filter((item) => item.allocationId === allocation.id)
            return (
              <article className="allocation-card" key={allocation.id}>
                <header className="allocation-heading">
                  <div>
                    <span>{categoryLabel(allocation.categoryCode)}</span>
                    <h3>{allocation.id}</h3>
                  </div>
                  <div className="allocation-amount">
                    <strong>{formatPaise(allocation.amountPaise)}</strong>
                    <small>{formatPaise(allocation.amountPaise - allocation.claimedPaise)} remaining</small>
                  </div>
                </header>

                <div className="expense-list">
                  {expenses.map((expense) => (
                    <section className="expense-card" id={expense.id} key={expense.id}>
                      <div className="expense-title">
                        <div>
                          <span className="claim-label">Expense claim</span>
                          <h4>{expense.id}</h4>
                        </div>
                        <strong>{formatPaise(expense.amountPaise)}</strong>
                      </div>

                      <HashVerifier
                        expenseId={expense.id}
                        expectedDigest={expense.receiptHash}
                        latestReview={expense.latestReview}
                        source={data.source}
                      />

                      <dl className="expense-details">
                        <div>
                          <dt>SHA-256 receipt digest</dt>
                          <dd title={expense.receiptHash}>{shortHex(expense.receiptHash, 12, 10)}</dd>
                        </div>
                        <div>
                          <dt>Submitted by</dt>
                          <dd title={expense.submitter}>{shortHex(expense.submitter)}</dd>
                        </div>
                        <div>
                          <dt>Transaction</dt>
                          <dd><a href={expense.chain.explorerUrl} target="_blank" rel="noreferrer">View on explorer ↗</a></dd>
                        </div>
                      </dl>

                      <div className="review-history">
                        <strong>Review history</strong>
                        {expense.reviewHistory.length === 0 ? (
                          <p>No reviewer decision has been recorded.</p>
                        ) : (
                          <ol>
                            {expense.reviewHistory.map((review) => (
                              <li key={review.chain.transactionHash}>
                                <span data-status={review.decision}>{reviewLabels[review.decision]}</span>
                                <div>
                                  <strong>{reasonLabel(review.reasonCode)}</strong>
                                  <small>
                                    {formatTimestamp(review.reviewedAt)} · reviewer{' '}
                                    <span title={review.reviewer}>{shortHex(review.reviewer)}</span>
                                  </small>
                                </div>
                                <a href={review.chain.explorerUrl} target="_blank" rel="noreferrer" aria-label={`Open review transaction for ${expense.id}`}>
                                  ↗
                                </a>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="timeline-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Public timeline</p>
            <h2>Confirmed chain history</h2>
          </div>
          <span className="count-pill">{timeline.length}</span>
        </div>
        <ol className="timeline">
          {timeline.map((entry) => (
            <li key={`${entry.chain.transactionHash}-${entry.chain.logIndex}`}>
              <span className={`timeline-mark timeline-${entry.kind}`} aria-hidden="true" />
              <div>
                <strong>{timelineLabels[entry.kind]}</strong>
                <code>{entry.recordId}</code>
                <small>{formatTimestamp(entry.timestamp)}</small>
              </div>
              <a href={entry.chain.explorerUrl} target="_blank" rel="noreferrer">
                Block {entry.chain.blockNumber.toLocaleString('en-IN')} ↗
              </a>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
