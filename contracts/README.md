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
```

The contract has not yet been deployed. Stage 3 will add deployment and canonical seed scripts, preserve confirmed transaction details, and export the ABI and deployment metadata to the frontend.
