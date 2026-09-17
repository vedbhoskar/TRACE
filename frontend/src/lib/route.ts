import { canonicalizeId } from './ids'

export type AppRoute =
  | { page: 'campaign' }
  | { page: 'trace'; donationId: string }
  | { page: 'submit' }
  | { page: 'review' }

export function parseHashRoute(hash: string): AppRoute {
  const path = hash.replace(/^#/, '') || '/'
  if (/^\/submit\/?$/.test(path)) return { page: 'submit' }
  if (/^\/review\/?$/.test(path)) return { page: 'review' }
  const match = path.match(/^\/trace\/([^/]+)\/?$/)
  if (!match) return { page: 'campaign' }
  let decoded: string
  try {
    decoded = decodeURIComponent(match[1])
  } catch {
    decoded = match[1]
  }
  try {
    return { page: 'trace', donationId: canonicalizeId(decoded) }
  } catch {
    return { page: 'trace', donationId: decoded.toUpperCase() }
  }
}

export function traceHref(donationId: string): string {
  return `#/trace/${encodeURIComponent(canonicalizeId(donationId))}`
}
