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

Stages 0–7 establish a reproducible toolchain, the canonical synthetic fixture, a tested ProofRegistry contract, a fully seeded Sepolia deployment, wallet-free public chain reads, local receipt-integrity comparison, an injected-wallet NGO expense-submission workspace, and a separately authorized reviewer workspace. The fixture includes validated short IDs, integer-paise money utilities, exact-byte SHA-256 receipt fixtures, and reconciled demonstration metrics. The contract enforces immutable NGO/reviewer roles, parent capacity limits, append-only claims, and preserved review history.

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

The Stage 3 verifier confirms ₹10,000 recorded, ₹10,000 allocated, ₹7,700 claimed, all frozen receipt digests, the three expected latest review states, and all nine canonical events. Stage 4 reads that exported deployment in a fresh browser without a wallet, reconstructs the full parent-child trail and review history, shows real explorer references, and keeps unknown-record, loading, RPC-error, and explicitly selected cached-snapshot states distinct. Stage 5 downloads fictional samples and compares a user-selected receipt locally against the displayed digest without uploading or rendering its contents. Stage 6 prepares a canonical expense ID and exact receipt digest, enforces wallet/network/role and remaining-capacity checks, previews the exact claim, and submits through the configured NGO's injected wallet with explicit transaction lifecycle and recovery states. No private signing material is bundled in the frontend.

The Stage 6 live acceptance transaction was explicitly approved by the operator and recorded expense `EX-MU4XGHLR-1YS0HMT`: ₹1,200 against `AL-FOOD-01`, with the frozen live-sample digest. It is visible in [transaction `0x1b642d…01c6e`](https://sepolia.etherscan.io/tx/0x1b642de0370fa773dc7f8ad67e49a80868612b4e853dcc8cce1c225bae601c6e). The public deployment now has ₹8,900 in claims and zero Food allocation remainder.

Stage 7 exposes unreviewed and flagged claims to the configured reviewer wallet, keeps file integrity checks independent from reviewer judgment, previews Attested/Flagged decisions and reason codes, and preserves every previous review event after confirmation. The operator separately approved an Attested / Document reviewed decision for the new claim in [transaction `0x94bcce…7aa19`](https://sepolia.etherscan.io/tx/0x94bcce51a24e7cf91ead0b0ff66e39780c60e601e26cb735e5b1ffb4f507aa19).

All planned demonstration entities, receipts, and amounts are synthetic. No real donation or real nonprofit activity is represented.
