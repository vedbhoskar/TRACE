import './App.css'
import { demoDataset } from './data/campaign'
import { categoryLabels, reviewLabels } from './data/demoLabels'
import { computeMetrics } from './lib/metrics'
import { formatPaise } from './lib/money'

const metrics = computeMetrics(demoDataset)

function App() {
  return (
    <main>
      <header>
        <p className="eyebrow">TRACE Proof · Stage 1 fixture</p>
        <h1>{demoDataset.campaign.title}</h1>
        <p className="disclaimer">
          Synthetic demonstration data. This is a proof registry scaffold, not a payment record.
        </p>
      </header>

      <section className="metrics" aria-label="Fixture totals">
        <article>
          <span>Recorded donation</span>
          <strong>{formatPaise(metrics.recordedDonationsPaise)}</strong>
        </article>
        <article>
          <span>Expense claims</span>
          <strong>{formatPaise(metrics.expenseClaimsPaise)}</strong>
        </article>
        <article>
          <span>Allocated, not claimed</span>
          <strong>{formatPaise(metrics.allocatedNotClaimedPaise)}</strong>
        </article>
        <article>
          <span>Claimed utilization</span>
          <strong>{metrics.claimedUtilization}</strong>
        </article>
      </section>

      <section className="trace" aria-labelledby="trace-heading">
        <div>
          <p className="eyebrow">Donation {demoDataset.donations[0].id}</p>
          <h2 id="trace-heading">Canonical three-branch trace</h2>
        </div>
        <div className="branches">
          {demoDataset.allocations.map((allocation) => {
            const expense = demoDataset.expenses.find(
              (item) => item.allocationId === allocation.id,
            )

            return (
              <article key={allocation.id}>
                <div className="branch-heading">
                  <span>{categoryLabels[allocation.category]}</span>
                  <code>{allocation.id}</code>
                </div>
                <strong>{formatPaise(allocation.amountPaise)}</strong>
                {expense && (
                  <p>
                    {expense.id}: {formatPaise(expense.amountPaise)} ·{' '}
                    <span data-status={expense.latestReview}>
                      {reviewLabels[expense.latestReview]}
                    </span>
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default App
