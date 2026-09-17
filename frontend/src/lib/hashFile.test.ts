import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { receiptFixtures } from '../data/campaign'
import {
  digestMatches,
  hashReceiptFile,
  sha256Hex,
  verifyReceiptFile,
} from './hashFile'

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
    await expect(hashReceiptFile(new Blob(['123']), 3)).resolves.toMatch(/^0x[0-9a-f]{64}$/)
    await expect(hashReceiptFile(new Blob(['1234']), 3)).rejects.toThrow('3 bytes')
  })

  it('compares locally without making a network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const bytes = await receiptBytes(receiptFixtures.foodOriginal.fileName)
    const result = await verifyReceiptFile(
      new Blob([Uint8Array.from(bytes).buffer]),
      receiptFixtures.foodOriginal.sha256.toUpperCase(),
    )

    expect(result).toEqual({
      digest: receiptFixtures.foodOriginal.sha256,
      matches: true,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('surfaces file-read failures instead of fabricating a digest', async () => {
    const unreadable = {
      size: 1,
      arrayBuffer: async () => Promise.reject(new Error('read failed')),
    } as Blob
    await expect(verifyReceiptFile(unreadable, receiptFixtures.foodOriginal.sha256))
      .rejects.toThrow('read failed')
  })
})
