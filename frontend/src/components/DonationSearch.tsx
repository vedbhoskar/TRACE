import { useState, type FormEvent } from 'react'
import { canonicalizeId } from '../lib/ids'
import { traceHref } from '../lib/route'

interface DonationSearchProps {
  initialValue?: string
  compact?: boolean
}

export function DonationSearch({ initialValue = '', compact = false }: DonationSearchProps) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      window.location.hash = traceHref(canonicalizeId(value))
      setError('')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Enter a valid donation ID')
    }
  }

  return (
    <form className={`donation-search ${compact ? 'search-compact' : ''}`} onSubmit={submit}>
      <label htmlFor={compact ? 'donation-search-compact' : 'donation-search'}>
        Find a donation record
      </label>
      <div>
        <input
          id={compact ? 'donation-search-compact' : 'donation-search'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="DON-8F42A1"
          autoComplete="off"
          spellCheck="false"
        />
        <button type="submit">Trace donation</button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </form>
  )
}
