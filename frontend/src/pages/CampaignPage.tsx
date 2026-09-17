import type { ProofData } from '../chainTypes'
import { DonationSearch } from '../components/DonationSearch'
import { demoDataset } from '../data/campaign'
import { categoryLabel, reviewLabels } from '../data/demoLabels'
import { computeProofMetrics } from '../lib/proofMetrics'
import { traceHref } from '../lib/route'
import { formatPaise } from '../lib/money'

interface CampaignPageProps {
  data: ProofData
}

export function CampaignPage({ data }: CampaignPageProps) {
  const metrics = computeProofMetrics(data)
  const attention = data.expenses.filter((expense) => expense.latestReview !== 'attested')
  const canonicalDonation = data.donations[0]

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Public evidence trail · synthetic demonstration</p>
          <h1>{demoDataset.campaign.title}</h1>
          <p className="hero-copy">
            Follow a declared donation into allocations and expense claims, inspect the recorded
            receipt fingerprint, and see the separate reviewer’s decision.
          </p>
          {canonicalDonation && (
            <a className="primary-link" href={traceHref(canonicalDonation.id)}>
              Trace the ₹10,000 demo donation <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
        <div className="promise-card">
          <span>TRACE Proof</span>
          <strong>See the claim.<br />Check the file.<br />Know the reviewer.</strong>
          <p>No wallet is needed to inspect this public testnet record.</p>
        </div>
      </section>

      <section className="metrics" aria-label="Confirmed campaign totals">
        <article>
          <span>Recorded donations</span>
          <strong>{formatPaise(metrics.recordedDonationsPaise)}</strong>
          <small>NGO-declared records</small>
        </article>
        <article>
          <span>Expense claims</span>
          <strong>{formatPaise(metrics.expenseClaimsPaise)}</strong>
          <small>{metrics.claimedUtilization} of recorded value</small>
        </article>
        <article>
          <span>Attested claims</span>
          <strong>{formatPaise(metrics.attestedPaise)}</strong>
          <small>Latest reviewer decision</small>
        </article>
        <article className="metric-alert">
          <span>Flagged claims</span>
          <strong>{formatPaise(metrics.flaggedPaise)}</strong>
          <small>Needs public attention</small>
        </article>
      </section>

      <section className="campaign-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Find the evidence</p>
              <h2>Search the public registry</h2>
            </div>
          </div>
          <DonationSearch initialValue={canonicalDonation?.id} />
          <p className="panel-note">
            IDs are normalized to uppercase. An unknown record is different from an unavailable RPC.
          </p>
        </div>

        <div className="panel attention-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Needs attention</p>
              <h2>Open review items</h2>
            </div>
            <span className="count-pill">{attention.length}</span>
          </div>
          <div className="attention-list">
            {attention.map((expense) => {
              const allocation = data.allocations.find((item) => item.id === expense.allocationId)
              return (
                <a key={expense.id} href={traceHref(canonicalDonation?.id ?? '')}>
                  <span data-status={expense.latestReview}>{reviewLabels[expense.latestReview]}</span>
                  <strong>{expense.id}</strong>
                  <small>
                    {allocation ? categoryLabel(allocation.categoryCode) : 'Unknown allocation'} ·{' '}
                    {formatPaise(expense.amountPaise)}
                  </small>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      <section className="truth-note">
        <strong>What this proves—and what it does not</strong>
        <p>
          Sepolia preserves these claims, receipt digests, signing addresses, and reviewer decisions.
          It does not prove that money moved, a receipt is truthful, every expense was disclosed, or
          the two addresses belong to independent people.
        </p>
      </section>
    </>
  )
}
