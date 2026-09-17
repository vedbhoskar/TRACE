import { useCallback, useEffect, useState } from 'react'
import {
  injectedProvider,
  readWallet,
  unavailableWallet,
  watchWallet,
  type WalletSnapshot,
} from '../lib/wallet'

interface WalletState extends WalletSnapshot {
  status: 'checking' | 'ready' | 'connecting' | 'error'
  error: string | null
  revision: number
}

function message(error: unknown): string {
  const candidate = error as { code?: number | string }
  if (candidate?.code === 4001 || candidate?.code === 'ACTION_REJECTED') {
    return 'Wallet connection was rejected. You can try again.'
  }
  return 'The wallet could not be read. Check the extension and try again.'
}

export function useWallet() {
  const [provider] = useState(injectedProvider)
  const [state, setState] = useState<WalletState>({
    ...unavailableWallet(),
    status: 'checking',
    error: null,
    revision: 0,
  })

  const update = useCallback(async (requestAccess = false, announce = true) => {
    if (announce) {
      setState((current) => ({
        ...current,
        status: requestAccess ? 'connecting' : 'checking',
        error: null,
      }))
    }
    try {
      const snapshot = await readWallet(provider, requestAccess)
      setState((current) => ({ ...snapshot, status: 'ready', error: null, revision: current.revision }))
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error: message(error) }))
    }
  }, [provider])

  useEffect(() => {
    void Promise.resolve().then(() => update(false, false))
    if (!provider) return
    return watchWallet(provider, () => {
      setState((current) => ({ ...current, revision: current.revision + 1 }))
      void update()
    })
  }, [provider, update])

  return {
    ...state,
    provider,
    connect: () => update(true),
    refresh: () => update(false),
  }
}
