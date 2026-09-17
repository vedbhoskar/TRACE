import { useEffect, useState } from 'react'
import './App.css'
import { SourceBadge } from './components/SourceBadge'
import { useProofData } from './hooks/useProofData'
import { parseHashRoute } from './lib/route'
import { CampaignPage } from './pages/CampaignPage'
import { TracePage } from './pages/TracePage'
import { SubmitPage } from './pages/SubmitPage'
import { ReviewPage } from './pages/ReviewPage'

function App() {
  const proof = useProofData()
  const [route, setRoute] = useState(() => parseHashRoute(window.location.hash))

  useEffect(() => {
    const updateRoute = () => {
      setRoute(parseHashRoute(window.location.hash))
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#/" aria-label="TRACE Proof campaign home">
          <span className="brand-mark" aria-hidden="true">T</span>
          <span><strong>TRACE</strong> Proof</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#/">Campaign</a>
          <a href="#/trace/DON-8F42A1">Trace explorer</a>
          <a href="#/submit">Submit claim</a>
          <a href="#/review">Review</a>
        </nav>
      </header>

      <main>
        {proof.status === 'loading' && (
          <section className="state-panel loading-state" aria-live="polite">
            <span className="loading-ring" aria-hidden="true" />
            <p className="eyebrow">Reading Ethereum Sepolia</p>
            <h1>Reconstructing the public trail</h1>
            <p>Checking the deployment, choosing one sync block, and loading confirmed events.</p>
          </section>
        )}

        {proof.status === 'error' && (
          <section className="state-panel error-state" role="alert">
            <span className="state-icon" aria-hidden="true">!</span>
            <p className="eyebrow">Unable to check Sepolia</p>
            <h1>Live chain data is unavailable</h1>
            <p>{proof.error}</p>
            <div className="state-actions">
              <button type="button" onClick={() => void proof.refresh()}>Retry live read</button>
              <button type="button" className="secondary-button" onClick={proof.useSnapshot}>
                View labeled cached snapshot
              </button>
            </div>
            <small>The snapshot is never substituted automatically and cannot enable writes.</small>
          </section>
        )}

        {proof.status === 'ready' && (
          <>
            <SourceBadge data={proof.data} onRefresh={() => void proof.refresh()} />
            {route.page === 'campaign' ? (
              <CampaignPage data={proof.data} />
            ) : route.page === 'submit' ? (
              <SubmitPage data={proof.data} onRefresh={proof.refresh} />
            ) : route.page === 'review' ? (
              <ReviewPage data={proof.data} onRefresh={proof.refresh} />
            ) : (
              <TracePage data={proof.data} donationId={route.donationId} />
            )}
          </>
        )}
      </main>

      <footer>
        <div>
          <strong>TRACE Proof</strong>
          <span>Synthetic public testnet demonstration</span>
        </div>
        <p>Proof registry, not payment custody or an authenticity guarantee.</p>
      </footer>
    </>
  )
}

export default App
