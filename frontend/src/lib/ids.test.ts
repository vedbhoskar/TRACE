import { describe, expect, it } from 'vitest'
import { bytes32ToId, canonicalizeId, idToBytes32 } from './ids'

describe('canonical IDs', () => {
  it('trims, uppercases, encodes, and decodes the canonical value', () => {
    const canonical = canonicalizeId('  don-8f42a1  ')
    expect(canonical).toBe('DON-8F42A1')
    expect(bytes32ToId(idToBytes32(canonical))).toBe(canonical)
  })

  it.each(['', '   ', 'DON 1', 'DON_1', 'DÖN-1', '-DON', 'DON--1'])(
    'rejects invalid ID %j',
    (value) => expect(() => canonicalizeId(value)).toThrow(),
  )

  it('rejects an ID longer than 31 bytes', () => {
    expect(() => canonicalizeId('A'.repeat(32))).toThrow('31 UTF-8 bytes')
  })
})
