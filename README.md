# TRACE Proof

TRACE Proof is a hackathon prototype for publishing and inspecting a small, public evidence trail:

`recorded donation -> allocations -> expense claims -> receipt integrity checks -> reviewer decisions`

The application is a proof registry, not a payment processor, bank ledger, accounting system, or guarantee that a submitted claim is true. The canonical synthetic dataset is recorded in a public ProofRegistry deployment on Ethereum Sepolia.

## Workspace

- `frontend/` — React, TypeScript, and Vite
- `contracts/` — Solidity, Hardhat 3, ethers v6, and TypeScript tests
- `docs/progress.md` — implementation checkpoints, validation, and known limitations
- `TRACE_PROOF_BUILD_BLUEPRINT.md` — locked build sequence and acceptance gates

Both packages use Node.js `22.19.0`, recorded in `.nvmrc`, and maintain independent npm lockfiles.

## Local setup

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

Copy the relevant `.env.example` to `.env` only when network configuration is needed. Never commit private keys, seed phrases, wallet files, or populated environment files.

## Current scope

Stages 0–4 establish a reproducible toolchain, the canonical synthetic fixture, a tested ProofRegistry contract, a fully seeded Sepolia deployment, and wallet-free public chain reads. The fixture includes validated short IDs, integer-paise money utilities, exact-byte SHA-256 receipt fixtures, and reconciled demonstration metrics. The contract enforces immutable NGO/reviewer roles, parent capacity limits, append-only claims, and preserved review history.

Public deployment:

- Network: Ethereum Sepolia (`11155111`)
- Contract: [`0x8b123800F17CbeBCE3546678A70a0b5414b779e3`](https://sepolia.etherscan.io/address/0x8b123800F17CbeBCE3546678A70a0b5414b779e3)
- Deployment block: `11718513`
- Deployment transaction: [`0x5fd30c59e1f23737dff9b6b8eda870691a63c0c219955b4419d81f047f435361`](https://sepolia.etherscan.io/tx/0x5fd30c59e1f23737dff9b6b8eda870691a63c0c219955b4419d81f047f435361)
- Canonical seed: 1 donation, 3 allocations, 3 expenses, and 2 reviews across 9 confirmed transactions
- Public transaction metadata: [`contracts/deployments/sepolia.json`](contracts/deployments/sepolia.json)

Run the Stage 1 checks with:

```bash
cd frontend
npm test
npm run build
npm run lint
```

The Stage 3 verifier confirms ₹10,000 recorded, ₹10,000 allocated, ₹7,700 claimed, all frozen receipt digests, the three expected latest review states, and all nine canonical events. Stage 4 reads that exported deployment in a fresh browser without a wallet, reconstructs the full parent-child trail and review history, shows real explorer references, and keeps unknown-record, loading, RPC-error, and explicitly selected cached-snapshot states distinct. Receipt comparison and wallet write flows belong to later stages.

All planned demonstration entities, receipts, and amounts are synthetic. No real donation or real nonprofit activity is represented.
