import { describe, expect, it, vi } from 'vitest'
import { assertNgoWallet, readWallet, unavailableWallet, walletConfig, watchWallet, type InjectedProvider } from './wallet'

function provider(accounts: string[], chainId = '0xaa36a7'): InjectedProvider {
  return {
    request: vi.fn(async ({ method }) => {
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return accounts
      if (method === 'eth_chainId') return chainId
      throw new Error(`Unexpected method ${method}`)
    }),
  }
}

describe('injected wallet state', () => {
  it('reports a missing injected wallet without requesting access', async () => {
    expect(await readWallet(undefined)).toEqual(unavailableWallet())
  })

  it('authorizes only the configured NGO on Sepolia', async () => {
    const state = await readWallet(provider([walletConfig.ngoAddress]))
    expect(state).toMatchObject({ connected: true, correctNetwork: true, authorizedNgo: true })
  })

  it('rejects a different account without mistaking it for a disconnected wallet', async () => {
    const state = await readWallet(provider(['0x0000000000000000000000000000000000000001']))
    expect(state).toMatchObject({ connected: true, correctNetwork: true, authorizedNgo: false })
  })

  it('detects the wrong chain independently from the account role', async () => {
    const state = await readWallet(provider([walletConfig.ngoAddress], '0x1'))
    expect(state).toMatchObject({ chainId: 1, correctNetwork: false, authorizedNgo: true })
  })

  it('enforces account and chain authorization immediately before writing', async () => {
    const wrongNetwork = await readWallet(provider([walletConfig.ngoAddress], '0x1'))
    const wrongAccount = await readWallet(provider(['0x0000000000000000000000000000000000000001']))
    const authorized = await readWallet(provider([walletConfig.ngoAddress]))
    expect(() => assertNgoWallet(unavailableWallet())).toThrow('Connect')
    expect(() => assertNgoWallet(wrongNetwork)).toThrow('Sepolia')
    expect(() => assertNgoWallet(wrongAccount)).toThrow('Only')
    expect(() => assertNgoWallet(authorized)).not.toThrow()
  })

  it('requests accounts only when connection is explicitly requested', async () => {
    const injected = provider([walletConfig.ngoAddress])
    await readWallet(injected, true)
    expect(injected.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' })
  })

  it('subscribes to both account and chain changes and removes both listeners', () => {
    const listeners = new Map<string, (...args: unknown[]) => void>()
    const injected = {
      request: vi.fn(),
      on: vi.fn((event: string, listener: (...args: unknown[]) => void) => listeners.set(event, listener)),
      removeListener: vi.fn(),
    } as unknown as InjectedProvider
    const changed = vi.fn()
    const stop = watchWallet(injected, changed)
    listeners.get('accountsChanged')?.([])
    listeners.get('chainChanged')?.('0x1')
    expect(changed).toHaveBeenCalledTimes(2)
    stop()
    expect(injected.removeListener).toHaveBeenCalledTimes(2)
  })
})
