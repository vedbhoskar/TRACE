# TRACE Proof contracts

`ProofRegistry.sol` records declared donation amounts, bounded allocations, expense claims with SHA-256 receipt digests, and decisions from a separately authorized reviewer. It never receives or transfers funds.

## Prototype guarantees

- Only the immutable NGO address can record donations, allocations, and expenses.
- Only the immutable reviewer address can attest or flag an expense.
- Allocations cannot exceed their parent donation.
- Expense claims cannot exceed their parent allocation.
- Record IDs are unique and records cannot be edited or deleted.
- Latest review state is available directly while every review remains in append-only history.
- Flagging an expense does not release its allocation capacity.

These rules constrain the submitted record. They do not prove that a receipt is genuine, that payment occurred, that every expense was disclosed, or that two wallet addresses are controlled by independent people.

## Validate locally

```bash
npm install
npm run compile
npm run typecheck
npm test
npm run rehearse:local
```

## Sepolia deployment

Use two demo-only accounts. Do not reuse a mainnet wallet. Configure values either in an ignored `.env` copied from `.env.example`, or in Hardhat's encrypted keystore:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set NGO_PRIVATE_KEY
npx hardhat keystore set REVIEWER_PRIVATE_KEY
```

If either entry already exists and needs correction, overwrite it explicitly:

```bash
npx hardhat keystore set NGO_PRIVATE_KEY --force
npx hardhat keystore set REVIEWER_PRIVATE_KEY --force
```

`NGO_PRIVATE_KEY` and `REVIEWER_PRIVATE_KEY` must each be a 32-byte private
key: 64 hexadecimal characters, optionally prefixed with `0x` (66 characters
total with the prefix). Do not enter the 42-character public wallet address,
a seed phrase, quoted text, or a JSON keystore. Never paste either private key
into chat, logs, source control, or deployment metadata.

Both accounts need Sepolia ETH because the NGO deploys and seeds records while the reviewer signs the two review decisions. Check readiness before any write:

```bash
npm run accounts:sepolia
```

Then run the guarded sequence:

```bash
npm run deploy:sepolia
npm run seed:sepolia
npm run verify:sepolia
npm run export:frontend
```

Deployment refuses to overwrite existing metadata. The seed script waits for every successful receipt and records public transaction references after each write. Verification uses the read-only network configuration. ABI export refuses to label a non-Sepolia deployment as live.

## Current public deployment

- Network: Ethereum Sepolia (`11155111`)
- ProofRegistry: [`0x8b123800F17CbeBCE3546678A70a0b5414b779e3`](https://sepolia.etherscan.io/address/0x8b123800F17CbeBCE3546678A70a0b5414b779e3)
- Deployment block: `11718513`
- Deployment transaction: [`0x5fd30c59e1f23737dff9b6b8eda870691a63c0c219955b4419d81f047f435361`](https://sepolia.etherscan.io/tx/0x5fd30c59e1f23737dff9b6b8eda870691a63c0c219955b4419d81f047f435361)
- Seed state: 1 donation, 3 allocations, 3 expenses, and 2 reviews
- Totals: ₹10,000 recorded, ₹10,000 allocated, and ₹7,700 claimed

The complete nine-transaction seed record and explorer links are stored in
`deployments/sepolia.json`. The ABI and public deployment configuration are
exported to `frontend/src/generated/`.
