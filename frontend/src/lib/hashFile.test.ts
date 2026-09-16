import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { receiptFixtures } from '../data/campaign'
import { digestMatches, hashReceiptFile, sha256Hex } from './hashFile'

async function receiptBytes(fileName: string): Promise<Uint8Array> {
  return readFile(new URL(`../../public/receipts/${fileName}`, import.meta.url))
}

describe('receipt SHA-256', () => {
  it('reproduces every frozen fixture digest from exact bytes', async () => {
    for (const receipt of Object.values(receiptFixtures)) {
      expect(await sha256Hex(await receiptBytes(receipt.fileName))).toBe(receipt.sha256)
    }
  })

  it('detects the visibly altered food receipt', async () => {
    const original = await sha256Hex(await receiptBytes(receiptFixtures.foodOriginal.fileName))
    const altered = await sha256Hex(await receiptBytes(receiptFixtures.foodAltered.fileName))

    expect(altered).not.toBe(original)
    expect(digestMatches(original.toUpperCase(), original)).toBe(true)
    expect(digestMatches(altered, original)).toBe(false)
  })

  it('rejects empty and oversized browser files', async () => {
    await expect(hashReceiptFile(new Blob([]))).rejects.toThrow('empty')
    await expect(hashReceiptFile(new Blob(['1234']), 3)).rejects.toThrow('3 bytes')
  })
})
