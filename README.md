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

Stage 0 establishes a reproducible frontend and contract toolchain. Donation records, allocation rules, expense claims, receipt hashing, reviewer decisions, testnet deployment, and the final interface belong to later stages and must not be represented as complete yet.

All planned demonstration entities, receipts, and amounts are synthetic. No real donation or real nonprofit activity is represented.
