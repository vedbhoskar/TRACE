import type { DemoDataset, ReceiptFixture } from '../types'

export const receiptFixtures = {
  foodOriginal: {
    fileName: 'food-supplies-original.svg',
    publicPath: '/receipts/food-supplies-original.svg',
    sha256: '0x24a51254bb2fa86a85ad7546fd696b87d3e3c792c8bf140f5dc806ee76e4c431',
  },
  foodAltered: {
    fileName: 'food-supplies-altered.svg',
    publicPath: '/receipts/food-supplies-altered.svg',
    sha256: '0x6afc60da60ccb670a2bdc3639cd8a2ff2905a638a6cb850e2783b7295079e16d',
  },
  medical: {
    fileName: 'medical-supplies.svg',
    publicPath: '/receipts/medical-supplies.svg',
    sha256: '0x9d809b56caa0acd349a3157ab6a6ee327b78aedb0b1179c1fd518dfc8b4afe79',
  },
  logistics: {
    fileName: 'logistics.svg',
    publicPath: '/receipts/logistics.svg',
    sha256: '0xa2db0324f4cc547235a62343efc31549114dc567f3f55f13494f391f46702b94',
  },
  liveFood: {
    fileName: 'food-live-submission.svg',
    publicPath: '/receipts/food-live-submission.svg',
    sha256: '0x3163b872d21cb963413914bc73ef62b7fe998b13428d1f8484709561ebae697c',
  },
} as const satisfies Record<string, ReceiptFixture>

export const demoDataset: DemoDataset = {
  campaign: {
    id: 'CAM-FLOOD-01',
    title: 'Maharashtra Flood Relief — Synthetic Demo',
    targetPaise: 2_500_000n,
    isSynthetic: true,
  },
  donations: [
    {
      id: 'DON-8F42A1',
      campaignId: 'CAM-FLOOD-01',
      amountPaise: 1_000_000n,
      sourceLabel: 'Synthetic donation record',
    },
  ],
  allocations: [
    { id: 'AL-FOOD-01', donationId: 'DON-8F42A1', category: 'FOOD', amountPaise: 600_000n },
    { id: 'AL-MED-01', donationId: 'DON-8F42A1', category: 'MEDICAL', amountPaise: 250_000n },
    { id: 'AL-LOG-01', donationId: 'DON-8F42A1', category: 'LOGISTICS', amountPaise: 150_000n },
  ],
  expenses: [
    {
      id: 'EX-FOOD-01', allocationId: 'AL-FOOD-01', amountPaise: 480_000n,
      receipt: receiptFixtures.foodOriginal, latestReview: 'attested', reviewReason: 'DOCUMENT_REVIEWED',
    },
    {
      id: 'EX-MED-01', allocationId: 'AL-MED-01', amountPaise: 200_000n,
      receipt: receiptFixtures.medical, latestReview: 'unreviewed',
    },
    {
      id: 'EX-LOG-01', allocationId: 'AL-LOG-01', amountPaise: 90_000n,
      receipt: receiptFixtures.logistics, latestReview: 'flagged', reviewReason: 'AMOUNT_DISCREPANCY',
    },
  ],
}
