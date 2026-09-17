import { describe, expect, it } from 'vitest'
import { parseHashRoute, traceHref } from './route'

describe('hash routes', () => {
  it('routes an empty hash to the campaign', () => {
    expect(parseHashRoute('')).toEqual({ page: 'campaign' })
    expect(parseHashRoute('#/')).toEqual({ page: 'campaign' })
  })

  it('normalizes a valid donation trace ID', () => {
    expect(parseHashRoute('#/trace/don-8f42a1')).toEqual({
      page: 'trace',
      donationId: 'DON-8F42A1',
    })
    expect(traceHref(' don-8f42a1 ')).toBe('#/trace/DON-8F42A1')
  })

  it('preserves an invalid searched value for the distinct unknown-record screen', () => {
    expect(parseHashRoute('#/trace/not_a_record')).toEqual({
      page: 'trace',
      donationId: 'NOT_A_RECORD',
    })
    expect(parseHashRoute('#/trace/%')).toEqual({
      page: 'trace',
      donationId: '%',
    })
  })
})
