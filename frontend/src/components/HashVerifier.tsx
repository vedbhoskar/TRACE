import { useRef, useState, type ChangeEvent } from 'react'
import type { ProofSource } from '../chainTypes'
import { receiptSamplesForExpense } from '../data/receiptSamples'
import { reviewLabels } from '../data/demoLabels'
import { verifyReceiptFile } from '../lib/hashFile'
import type { ReviewStatus } from '../types'

type VerificationState =
  | { status: 'idle' }
  | { status: 'hashing'; fileName: string }
  | {
      status: 'matched' | 'mismatched'
      fileName: string
      fileSize: number
      digest: string
    }
  | { status: 'error'; fileName: string; message: string }

interface HashVerifierProps {
  expenseId: string
  expectedDigest: string
  latestReview: ReviewStatus
  source: ProofSource
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function verificationLabel(state: VerificationState): string {
  if (state.status === 'hashing') return 'Calculating SHA-256'
  if (state.status === 'matched') return 'Hash matched'
  if (state.status === 'mismatched') return 'Hash mismatch'
  if (state.status === 'error') return 'Check failed'
  return 'File not checked'
}

function verificationSymbol(state: VerificationState): string {
  if (state.status === 'hashing') return '…'
  if (state.status === 'matched') return '✓'
  if (state.status === 'mismatched' || state.status === 'error') return '×'
  return '◇'
}

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message.includes('empty')) {
    return 'The selected file is empty. Choose a receipt containing at least one byte.'
  }
  if (error instanceof Error && error.message.includes('bytes or smaller')) {
    return 'The selected file exceeds the 5 MB receipt limit.'
  }
  return 'The browser could not read and hash this file. Try selecting it again.'
}

export function HashVerifier({
  expenseId,
  expectedDigest,
  latestReview,
  source,
}: HashVerifierProps) {
  const [state, setState] = useState<VerificationState>({ status: 'idle' })
  const requestNumber = useRef(0)
  const samples = receiptSamplesForExpense(expenseId)
  const inputId = `receipt-check-${expenseId.toLowerCase()}`

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const request = ++requestNumber.current
    if (!file) {
      setState({ status: 'idle' })
      return
    }

    setState({ status: 'hashing', fileName: file.name })
    try {
      const result = await verifyReceiptFile(file, expectedDigest)
      if (request !== requestNumber.current) return
      setState({
        status: result.matches ? 'matched' : 'mismatched',
        fileName: file.name,
        fileSize: file.size,
        digest: result.digest,
      })
    } catch (error) {
      if (request !== requestNumber.current) return
      setState({ status: 'error', fileName: file.name, message: friendlyError(error) })
    }
  }

  return (
    <div className="hash-verifier">
      <div className="evidence-summary" aria-label={`Evidence summary for ${expenseId}`}>
        <span className="evidence-neutral">✓ Claim recorded</span>
        <span className={`integrity-${state.status}`}>
          {verificationSymbol(state)} {verificationLabel(state)}
        </span>
        <span data-status={latestReview}>{reviewLabels[latestReview]}</span>
      </div>

      <div className="integrity-panel">
        <div className="integrity-heading">
          <div>
            <span className="claim-label">Local integrity check</span>
            <strong>Compare a receipt with the recorded fingerprint</strong>
          </div>
          <span className="local-only">Runs only in this browser</span>
        </div>

        {samples.length > 0 && (
          <div className="sample-downloads">
            <span>Fictional demo files</span>
            <div>
              {samples.map((sample) => (
                <a key={sample.fileName} href={sample.publicPath} download={sample.fileName}>
                  {sample.label} ↓
                </a>
              ))}
            </div>
          </div>
        )}

        <label className="file-picker" htmlFor={inputId}>
          <span>Choose receipt file</span>
          <input
            id={inputId}
            type="file"
            accept=".svg,.pdf,image/*"
            onChange={(event) => void selectFile(event)}
          />
          <small>Maximum 5 MB · SHA-256 over exact raw bytes</small>
        </label>

        <div className={`verification-result result-${state.status}`} aria-live="polite">
          {state.status === 'idle' && (
            <p>Select a locally available receipt to compare it. No file has been checked.</p>
          )}
          {state.status === 'hashing' && (
            <p>Calculating SHA-256 for <strong>{state.fileName}</strong>…</p>
          )}
          {state.status === 'matched' && (
            <>
              <strong>Hash matched</strong>
              <p>
                This file matches the digest {source.mode === 'live' ? 'recorded for this claim' : 'in the cached snapshot'}.
                {' '}It does not prove that the receipt is truthful or that a payment occurred.
              </p>
              <small>{state.fileName} · {formatFileSize(state.fileSize)}</small>
              <code title={state.digest}>{state.digest}</code>
            </>
          )}
          {state.status === 'mismatched' && (
            <>
              <strong>Hash mismatch</strong>
              <p>
                This is a different file from the one recorded; it may have been changed or selected
                incorrectly. This local result does not flag or alter the claim.
              </p>
              <small>{state.fileName} · {formatFileSize(state.fileSize)}</small>
              <code title={state.digest}>{state.digest}</code>
            </>
          )}
          {state.status === 'error' && (
            <>
              <strong>File could not be checked</strong>
              <p>{state.message}</p>
              <small>{state.fileName}</small>
            </>
          )}
        </div>

        <p className="privacy-note">
          The selected file stays on this device. TRACE Proof reads its bytes for hashing and does
          not upload or display the file contents. The comparison is independent of reviewer status.
          {source.mode === 'snapshot' && ' Live chain data was not freshly checked.'}
        </p>
      </div>
    </div>
  )
}
