# TRACE Proof frontend

React, TypeScript, Vite, and ethers power the public TRACE Proof campaign and
donation-trace views. A visitor does not need a wallet: the app reads the
exported ProofRegistry deployment from Ethereum Sepolia and reconstructs the
confirmed record hierarchy from events.

## Run locally

```bash
npm install
npm run dev
```

The default public Sepolia RPC can be overridden by copying `.env.example` to
`.env` and setting `VITE_SEPOLIA_RPC_URL`. Every `VITE_*` value is public; never
put a private key, mnemonic, wallet file, or secret RPC credential there.

## Validate

```bash
npm test
npm run build
npm run lint
```

## Public data behavior

- `src/generated/deployment.json` is the canonical network, address, deployment
  block, and public transaction configuration.
- The read repository checks the configured chain and immutable contract roles,
  chooses one synchronization block, and reads logs from the deployment block
  in bounded adaptive chunks.
- Donation, allocation, expense, latest-review, review-history, and timeline
  views are reconstructed from confirmed events.
- Unknown donation IDs show “No record found” only after a successful chain
  read. RPC failures show “Unable to check Sepolia.”
- A bundled canonical snapshot is available only through an explicit error-state
  action and is labeled `Cached snapshot · … · not freshly checked`.
- Each expense exposes fictional sample downloads and a local file chooser. The
  browser rejects empty or over-5-MB files, computes SHA-256 over the exact raw
  bytes, and compares that value with the live or clearly labeled cached digest.
  Selected bytes are neither uploaded nor rendered into the page.

The current UI is read-only. Wallet-backed expense submission and reviewer
writes belong to later build stages.
