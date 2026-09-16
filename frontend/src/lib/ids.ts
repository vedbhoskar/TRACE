import { decodeBytes32String, encodeBytes32String } from 'ethers'
import type { CanonicalId } from '../types'

const ID_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/
const MAX_BYTES32_STRING_BYTES = 31

export function canonicalizeId(input: string): CanonicalId {
  const canonical = input.trim().toUpperCase()

  if (!canonical) {
    throw new Error('ID is required')
  }

  if (!ID_PATTERN.test(canonical)) {
    throw new Error('ID must contain only ASCII letters, numbers, and single hyphens')
  }

  if (new TextEncoder().encode(canonical).length > MAX_BYTES32_STRING_BYTES) {
    throw new Error('ID must fit in 31 UTF-8 bytes')
  }

  return canonical
}

export function idToBytes32(input: string): `0x${string}` {
  return encodeBytes32String(canonicalizeId(input)) as `0x${string}`
}

export function bytes32ToId(value: string): CanonicalId {
  return canonicalizeId(decodeBytes32String(value))
}
