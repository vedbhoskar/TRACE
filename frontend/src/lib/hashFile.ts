export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024

export async function sha256Hex(
  input: ArrayBuffer | Uint8Array,
): Promise<`0x${string}`> {
  const bytes = input instanceof Uint8Array ? Uint8Array.from(input) : new Uint8Array(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')

  return `0x${hex}`
}

export async function hashReceiptFile(
  file: Blob,
  maxBytes = MAX_RECEIPT_BYTES,
): Promise<`0x${string}`> {
  if (file.size === 0) {
    throw new Error('Receipt file is empty')
  }

  if (file.size > maxBytes) {
    throw new Error(`Receipt must be ${maxBytes} bytes or smaller`)
  }

  return sha256Hex(await file.arrayBuffer())
}

export function digestMatches(actual: string, expected: string): boolean {
  return actual.trim().toLowerCase() === expected.trim().toLowerCase()
}

export interface ReceiptVerification {
  digest: `0x${string}`
  matches: boolean
}

export async function verifyReceiptFile(
  file: Blob,
  expectedDigest: string,
  maxBytes = MAX_RECEIPT_BYTES,
): Promise<ReceiptVerification> {
  const digest = await hashReceiptFile(file, maxBytes)
  return { digest, matches: digestMatches(digest, expectedDigest) }
}
