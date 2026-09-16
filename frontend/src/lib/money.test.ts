import { describe, expect, it } from 'vitest'
import { formatPaise, paiseToDecimalString, parseInrToPaise } from './money'

describe('integer INR money utilities', () => {
  it.each([
    ['0.01', 1n],
    ['10.10', 1_010n],
    ['10000', 1_000_000n],
    ['999999999999999999999999.99', 99_999_999_999_999_999_999_999_999n],
  ])('parses %s without floating-point arithmetic', (input, expected) => {
    expect(parseInrToPaise(input)).toBe(expected)
  })

  it.each(['', ' ', '-1', '+1', '0', '0.00', '1.001', '1e3', '1,000', '.50'])(
    'rejects invalid amount %j',
    (input) => expect(() => parseInrToPaise(input)).toThrow(),
  )

  it('formats paise with Indian digit grouping', () => {
    expect(formatPaise(1_000_000n)).toBe('₹10,000')
    expect(formatPaise(1_234_567_890n)).toBe('₹1,23,45,678.90')
    expect(paiseToDecimalString(1_010n)).toBe('10.10')
  })
})
