# TRACE Proof

TRACE Proof is a hackathon prototype for publishing and inspecting a small, public evidence trail:

`recorded donation -> allocations -> expense claims -> receipt integrity checks -> reviewer decisions`

The application is a proof registry, not a payment processor, bank ledger, accounting system, or guarantee that a submitted claim is true. The Stage 0 workspace contains scaffolding only; application functionality and a public deployment have not yet been implemented.

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

Stages 0–2 establish a reproducible toolchain, the canonical synthetic fixture, and a tested ProofRegistry contract. The fixture includes validated short IDs, integer-paise money utilities, exact-byte SHA-256 receipt fixtures, and reconciled demonstration metrics. The contract enforces immutable NGO/reviewer roles, parent capacity limits, append-only claims, and preserved review history.

Run the Stage 1 checks with:

```bash
cd frontend
npm test
npm run build
npm run lint
```

The ProofRegistry is currently verified only on Hardhat's local simulated network. Chain-backed frontend reads, wallet write flows, seeded records, and public deployment belong to later stages and must not be represented as complete yet.

All planned demonstration entities, receipts, and amounts are synthetic. No real donation or real nonprofit activity is represented.
