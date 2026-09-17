# TRACE Proof

> Every allocation. Every proof. Publicly verifiable.

TRACE Proof is a Web3 platform for transparent donation and fund-utilization tracking.

It brings the full giving journey together in one public, explorable trail:

```text
donation -> allocations -> expense claims -> receipt verification -> reviewer attestations
```

Donors can explore campaigns, trace donations, inspect expenses, verify receipt fingerprints, and follow reviewer decisions with on-chain timestamps and explorer links — all in a clean, wallet-optional browsing experience.

## Live Deployment

**Deployed URL:** https://sepolia.etherscan.io/address/0x8b123800F17CbeBCE3546678A70a0b5414b779e3

- Network: Ethereum Sepolia (`11155111`)
- Contract: [`0x8b123800F17CbeBCE3546678A70a0b5414b779e3`](https://sepolia.etherscan.io/address/0x8b123800F17CbeBCE3546678A70a0b5414b779e3)
- Deployment block: `11718513`
- Deployment transaction: [`0x5fd30c59e1f23737dff9b6b8eda870691a63c0c219955b4419d81f047f435361`](https://sepolia.etherscan.io/tx/0x5fd30c59e1f23737dff9b6b8eda870691a63c0c219955b4419d81f047f435361)
- Demo data: 1 donation, 3 allocations, 3 expenses, 2 reviews across 9 confirmed transactions
- Live activity:
  - Expense `EX-MU4XGHLR-1YS0HMT` (₹1,200 for `AL-FOOD-01`): [`0x1b642d…01c6e`](https://sepolia.etherscan.io/tx/0x1b642de0370fa773dc7f8ad67e49a80868612b4e853dcc8cce1c225bae601c6e)
  - Review Attested / Document reviewed: [`0x94bcce…7aa19`](https://sepolia.etherscan.io/tx/0x94bcce51a24e7cf91ead0b0ff66e39780c60e601e26cb735e5b1ffb4f507aa19)
- Transaction history: [`contracts/deployments/sepolia.json`](contracts/deployments/sepolia.json)
- Current demo totals: ₹10,000 recorded, ₹10,000 allocated, ₹8,900 claimed

Demo frontend: `https://vedbhoskar.github.io/TRACE/`

## Why TRACE Proof

Donors usually get a payment receipt and much later a summary report. In between, there is a trust gap — how funds were allocated, what evidence was shared, and who reviewed it.

TRACE Proof closes that gap with a shared public register where:

- campaigns showcase goals and utilization
- donations link to allocations and expenses
- expenses carry SHA-256 receipt fingerprints
- reviewers share attested / flagged decisions with reasons
- every step links to block timestamps and Etherscan transactions

## Product Tour

### Campaign view

Showcases the Maharashtra Flood Relief campaign `CAM-FLOOD-01` with live totals, allocation breakdowns, utilization coverage, attested / flagged / awaiting-review splits, needs-attention highlights, and a full event timeline.

### Trace Explorer

Search a donation like `DON-8F42A1` and follow its complete parent-child trail — donation details, linked allocations, related expense claims, receipt digests, latest reviewer states, full append-only review history, and direct explorer links for each confirmation.

### Receipt verification

Each expense offers sample receipt downloads plus a local file picker. The browser computes SHA-256 over the exact bytes and compares it with the on-chain digest, showing clear matched / mismatched states with helpful explanations.

### NGO workspace (`#/submit`)

A guided flow for contributors to prepare expense claims — allocation capacity preview, INR-to-paise handling, unique ID generation, local receipt hashing, exact contract-input preview, wallet connection, and rich pending / confirmed / recovery states with transaction and trail links.

### Reviewer workspace (`#/review`)

A focused queue of unreviewed and flagged claims with full claim context, independent receipt checking, Attested / Flagged decision previews with reason codes, and complete preserved history after confirmation.

## For Everyone

**Donors:** browse campaigns and traces freely, inspect evidence and reviews, share explorer links with confidence.

**NGOs:** record allocations and expenses transparently, build a lasting reporting trail, highlight attested work.

**Reviewers / auditors:** review claims independently, publish structured decisions, keep every prior review visible.

**Public observers:** explore utilization, verification coverage, flagged items, timestamps and signers across the whole trail.

## How It Works

1. A donation is recorded for a campaign
2. The campaign allocation splits across focus areas like Food, Medical and Logistics
3. Expenses are claimed against allocations with receipt fingerprints
4. Anyone can re-check the receipt fingerprint locally
5. Reviewers publish attested / flagged decisions with reasons
6. The frontend reconstructs everything from confirmed Sepolia events for transparent browsing

All reads are wallet-optional and event-based. Wallet-connected actions light up for the configured NGO and reviewer roles on the correct network.

## Architecture

```text
TRACE/
├── frontend/     React + Vite + TypeScript + ethers v6
│   ├── src/pages/        campaign, trace, submit, review routes
│   ├── src/components/   source badges, search, metadata, integrity panels
│   ├── src/lib/          chain repository, hashing, formatting, validation
│   ├── src/generated/    exported Sepolia deployment + ABI
│   └── public/           sample receipt assets
├── contracts/    Solidity + Hardhat 3 + ethers v6
│   ├── contracts/ProofRegistry.sol
│   ├── test/             TypeScript + Solidity suites
│   ├── scripts/          deploy, seed, verify, export
│   └── deployments/sepolia.json
├── docs/progress.md
├── IDEATION.md
├── IMPLEMENTATION_PLAN.md
└── TRACE_PROOF_BUILD_BLUEPRINT.md
```

**Smart contract — `ProofRegistry.sol`:** donation, allocation and expense records with parent capacity tracking, receipt digests, role-based recording and reviewing, latest review state plus full history, and reconstructable events for rich frontends.

**Frontend data layer:** typed chain repository with adaptive bounded log reads from the deployment block, deterministic reconstruction, single-block source markers, live metrics, labeled cached-snapshot fallback, and hash routing + relative assets for smooth static hosting.

## Demo Story

Campaign `CAM-FLOOD-01` — Maharashtra Flood Relief — featuring donation `DON-8F42A1` (₹10,000) across Food, Medical and Logistics allocations, with ₹8,900 in claims, layered review activity, downloadable sample receipts, and end-to-end explorer visibility.

A great 3-minute demo path: open campaign → trace `DON-8F42A1` → open an expense → verify a receipt → show reviewer history → open Etherscan.

## Stack

- Frontend: React 19 + Vite + TypeScript + ethers v6
- Styling: modern CSS with responsive layouts and strong focus states
- Contracts: Solidity 0.8.34 + Hardhat 3 + TypeScript tests
- Hashing: Browser Web Crypto API (SHA-256)
- Network: Ethereum Sepolia
- Hosting: static build with hash routes, ready for GitHub Pages project path

## Run Locally

Requirements: Node.js `22.19.0` (see `.nvmrc`)

```bash
nvm use
cd frontend
npm install
npm run dev
```

In a second terminal:

```bash
cd contracts
npm install
npm run compile
npm test
```

Frontend checks:

```bash
cd frontend
npm test
npm run build
npm run lint
```

Contracts checks:

```bash
cd contracts
npm run compile
npm run typecheck
npm test
npm run rehearse:local
```

Copy `.env.example` to `.env` only when custom network configuration is needed. `VITE_*` values are public browser settings.

## Deployment Notes

- Canonical seed + live demo writes are preserved in `contracts/deployments/sepolia.json` with explorer URLs
- ABI + deployment config are exported to `frontend/src/generated/` for wallet-optional reads
- Production frontend build uses hash routing and relative assets and has been verified under the `/TRACE/` project path
- Sepolia RPC endpoint is configurable via `VITE_SEPOLIA_RPC_URL`

## Roadmap Ideas

- Additional campaigns and richer utilization visualizations
- Search suggestions and saved traces
- Enhanced reviewer analytics and coverage insights
- Broader wallet and network conveniences
- Polished mobile storytelling and presentation mode
