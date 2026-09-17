import { describe, expect, it } from 'vitest'
import { publicAssetUrl } from './publicAsset'

describe('static-host public assets', () => {
  it('keeps receipt downloads relative to the configured Vite base', () => {
    expect(publicAssetUrl('/receipts/food-supplies-original.svg')).toBe('/receipts/food-supplies-original.svg')
  })
})
