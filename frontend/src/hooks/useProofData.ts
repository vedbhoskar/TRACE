import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProofData } from '../chainTypes'
import { createCanonicalSnapshot } from '../data/snapshot'

type ProofDataState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: ProofData; error: null }
  | { status: 'error'; data: null; error: string }

function publicError(error: unknown): string {
  if (error instanceof Error && error.message.includes('unexpected chain')) {
    return 'The configured RPC connected to the wrong network.'
  }
  if (error instanceof Error && error.message.includes('does not match')) {
    return 'The public deployment configuration does not match the contract.'
  }
  return 'Sepolia could not be checked. Your connection or the public RPC may be unavailable.'
}

async function loadLiveProofData(): Promise<ProofData> {
  const repository = await import('../lib/chainRepository')
  return repository.loadProofData()
}

export function useProofData() {
  const [state, setState] = useState<ProofDataState>({
    status: 'loading',
    data: null,
    error: null,
  })
  const requestNumber = useRef(0)

  const refresh = useCallback(async () => {
    const request = ++requestNumber.current
    setState((current) => current.status === 'ready'
      ? current
      : { status: 'loading', data: null, error: null })
    try {
      const data = await loadLiveProofData()
      if (request === requestNumber.current) {
        setState({ status: 'ready', data, error: null })
      }
    } catch (error) {
      if (request === requestNumber.current) {
        setState({ status: 'error', data: null, error: publicError(error) })
      }
    }
  }, [])

  const useSnapshot = useCallback(() => {
    requestNumber.current += 1
    setState({ status: 'ready', data: createCanonicalSnapshot(), error: null })
  }, [])

  useEffect(() => {
    const request = ++requestNumber.current
    void loadLiveProofData()
      .then((data) => {
        if (request === requestNumber.current) {
          setState({ status: 'ready', data, error: null })
        }
      })
      .catch((error: unknown) => {
        if (request === requestNumber.current) {
          setState({ status: 'error', data: null, error: publicError(error) })
        }
      })
    return () => {
      requestNumber.current += 1
    }
  }, [])

  return { ...state, refresh, useSnapshot }
}
