# TRACE Proof — Product Ideation

## 1. Problem statement

**WB-05:** Develop a Web3-based platform for transparent donation and fund-utilization tracking.

Donors usually receive a payment receipt and, much later, a summary report. Between those two points they cannot independently inspect how funds were allocated, what expense evidence was submitted, whether a document later changed, or who reviewed it.

The problem is therefore not simply accepting donations. The real problem is the **trust gap after a donation is made**.

## 2. Proposed solution

**TRACE Proof** is a public, tamper-evident utilization register for nonprofit campaigns.

It creates a verifiable trail:

```text
Campaign
   ↓
Donation record
   ↓
Allocation
   ↓
Expense claim
   ↓
Receipt hash
   ↓
Independent attestation
   ↓
Public verification
```

Anyone can search a donation or campaign ID and inspect its allocation trail, associated expense evidence, blockchain timestamps, responsible signers, and review status.

### One-line pitch

> TRACE Proof lets donors inspect the evidence behind every fund-utilization claim instead of relying only on a final report.

### Tagline

> Every allocation. Every proof. Publicly verifiable.

## 3. The important honesty boundary

TRACE Proof provides a **verifiable allocation trail**. It does not claim that a specific physical rupee can be followed through a bank account.

Money is fungible. When an organization combines donations, the platform can prove that:

- a donation and its intended campaign were recorded;
- the organization declared particular allocations and expenses;
- a particular evidence file was anchored at a particular time;
- the anchored file has or has not changed;
- an identified reviewer attested to or flagged the claim.

It cannot prove by blockchain alone that:

- a vendor or receipt is genuine;
- goods were physically delivered;
- a stated price is fair;
- a bank payment occurred;
- the originally uploaded document was truthful.

For this reason, the UI should say **“document integrity verified”** or **“hash matched,”** never “receipt proven authentic.”

## 4. Target users

### Donor

Wants to understand how a contribution was assigned and see evidence without creating an account.

### NGO operator

Records allocations and expense claims, attaches evidence, and creates a transparent reporting trail.

### Auditor or verifier

Reviews an expense claim and either attests to it or flags it. The reviewer does not erase or modify the NGO's original submission.

### Public observer

Can inspect campaign activity, verification coverage, flagged claims, timestamps, and blockchain transactions.

## 5. Core user story

Use one excellent demonstration story throughout the product, presentation, screenshots, and video.

### Campaign

- Name: Maharashtra Flood Relief
- Campaign ID: `CAM-FLOOD-01`
- Target: ₹10,00,000
- Total recorded donations: ₹4,82,500
- Total utilized: ₹3,61,000

### Featured donation

- Donation ID: `DON-8F42A1`
- Amount: ₹10,000
- Donor: Anonymous public wallet
- Intended campaign: Maharashtra Flood Relief

### Allocation trail

```text
₹10,000 donation record
├── ₹6,000 — Food supplies
├── ₹2,500 — Medical supplies
└── ₹1,500 — Logistics
```

The food-supplies expense should include a sample receipt whose original file produces a hash match. A visibly altered copy should produce a mismatch. This creates an understandable live “wow” moment.

## 6. MVP scope

Build only four primary experiences.

### A. Public campaign page

Show:

- campaign purpose and target;
- amount received, allocated, and utilized;
- percentage of expenses reviewed;
- flagged amount, if any;
- recent proof events;
- a clear entry point to the Trace Explorer.

Avoid a long marketing site. One concise hero section above the campaign content is enough.

### B. Trace Explorer — the hero feature

A visitor searches for `DON-8F42A1` or opens a featured example.

The result displays:

- donation amount, campaign, timestamp, and signer;
- allocation branches and remaining unallocated amount;
- connected expense claims;
- receipt-hash status;
- auditor status;
- shortened transaction hashes with explorer links;
- an event timeline showing who did what and when.

Use the labels `Recorded`, `Submitted`, `Integrity matched`, `Attested`, and `Flagged`. Do not use a single vague “verified” badge.

### C. NGO proof submission

The NGO operator can:

1. select a campaign;
2. enter category, amount, vendor label, description, and date;
3. select a receipt or invoice;
4. calculate its SHA-256 digest in the browser;
5. submit the expense proof through a wallet;
6. receive a transaction hash and pending/confirmed state.

The document itself remains off-chain. Only its cryptographic digest and essential claim metadata are anchored on-chain.

### D. Auditor attestation

An authorized verifier can inspect an expense claim and choose:

- `Attest` — the reviewer accepts the claim for the purpose of the prototype;
- `Flag` — the reviewer found an issue requiring follow-up.

The action records the reviewer address, timestamp, decision, and optional reason hash. Previous records remain visible.

## 7. What is deliberately excluded

These items are outside the 10-hour MVP:

- real fiat or production cryptocurrency payments;
- bank integration and settlement reconciliation;
- KYC, full authentication, or identity verification;
- DAO governance, tokens, NFTs, or rewards;
- multi-chain deployment;
- AI chatbots or ungrounded price analysis;
- vendor onboarding and procurement management;
- a mobile application;
- production-grade document storage;
- a large admin dashboard;
- automatic fraud detection.

Excluding them is a product decision, not an omission. The prototype is designed to prove one difficult trust property well.

## 8. Why blockchain is justified

A normal database administrator can edit records. A blockchain proof registry provides:

- immutable event history;
- public timestamps;
- visible signer addresses;
- independent inspection through a block explorer;
- tamper evidence for linked documents;
- separation between an NGO submission and an auditor attestation.

Blockchain is the trust infrastructure underneath the experience, not the headline feature.

## 9. Trust model

TRACE Proof uses layered evidence instead of presenting trust as a binary state.

| Layer | What it establishes | What it does not establish |
|---|---|---|
| NGO submission | The organization made a claim | The claim is true |
| Blockchain timestamp | The claim existed at that time | The underlying event happened |
| Receipt hash | The checked file matches the anchored file | The original file is genuine |
| Auditor attestation | A named reviewer accepted the claim | Absolute absence of fraud |
| Public trail | Changes and decisions are inspectable | Physical delivery of goods |

This trust model is a strong judging answer because it states precisely what the technology can and cannot prove.

## 10. Suggested screens and interface

### Visual direction

- Deep navy or charcoal background
- White content surfaces or high-contrast dark cards
- Electric blue for recorded blockchain actions
- Emerald for attested states
- Amber for pending states
- Red for flagged or hash-mismatch states
- Minimal glass effects; prioritize readability
- Monospaced font only for IDs, hashes, and technical metadata

### Navigation

```text
TRACE Proof | Campaign | Trace Explorer | Submit Proof | Review
```

For the prototype, use a clearly labeled role switcher:

```text
Demo role: Donor | NGO | Auditor
```

This avoids spending hours on authentication while keeping the flow understandable.

### Meaningful metrics

Prefer trust metrics over decorative charts:

- utilization rate;
- reviewed expense coverage;
- attested amount;
- flagged amount;
- unallocated balance;
- number of on-chain proof events.

## 11. Smart-contract concept

Use a small **proof registry**, not a payment-processing contract.

### Primary records

```solidity
enum ReviewStatus { Unreviewed, Attested, Flagged }

struct DonationProof {
    bytes32 donationId;
    bytes32 campaignId;
    uint256 amountInPaise;
    address recordedBy;
    uint64 recordedAt;
}

struct AllocationProof {
    bytes32 allocationId;
    bytes32 donationId;
    uint256 amountInPaise;
    bytes32 categoryHash;
    uint64 recordedAt;
}

struct ExpenseProof {
    bytes32 expenseId;
    bytes32 allocationId;
    uint256 amountInPaise;
    bytes32 receiptHash;
    address submittedBy;
    address reviewedBy;
    uint64 submittedAt;
    ReviewStatus status;
}
```

### Essential rules

- Record IDs are unique and cannot be overwritten.
- Only the authorized NGO account can record donations, allocations, and expenses.
- Only the authorized auditor account can attest or flag an expense.
- An allocation cannot exceed the unallocated amount of its donation.
- Connected expenses cannot exceed the allocation amount.
- Review decisions cannot silently replace the original expense proof.
- Every state-changing action emits an event.
- Store amounts as integer paise; never use floating-point values.

### Essential events

```solidity
event DonationRecorded(bytes32 indexed donationId, bytes32 indexed campaignId, uint256 amount);
event AllocationRecorded(bytes32 indexed allocationId, bytes32 indexed donationId, uint256 amount);
event ExpenseSubmitted(bytes32 indexed expenseId, bytes32 indexed allocationId, bytes32 receiptHash);
event ExpenseReviewed(bytes32 indexed expenseId, address indexed reviewer, ReviewStatus status);
```

## 12. Suggested architecture

```text
React + Vite interface
        │
        ├── Seeded campaign metadata for a reliable demo
        ├── Browser Web Crypto API for SHA-256 hashing
        └── ethers.js wallet integration
                    │
                    ▼
            ProofRegistry contract
                    │
                    ▼
              EVM test network
```

For a 10-hour prototype, avoid a database unless the core experience is already finished. Campaign descriptions and seeded examples can live in local JSON, while proof-critical fields come from contract reads and events.

If a backend is later required, use it only for search indexing, document storage, notifications, and reporting. It must not be presented as the source of immutable truth.

## 13. Innovation and impact

### Innovation

- Replaces a single “verified” badge with layered, inspectable evidence.
- Demonstrates tampering by comparing the original and modified receipt hashes.
- Separates NGO claims from independent reviewer decisions.
- Makes on-chain records understandable to non-technical donors.

### Expected impact

- Gives donors clearer post-donation visibility.
- Encourages organizations to submit consistent evidence.
- Creates an auditable record for reviewers and grant makers.
- Makes disputed or unreviewed expenses visible instead of hiding uncertainty.

### Success metrics for a future pilot

- percentage of expenses with anchored evidence;
- median time from expense submission to review;
- percentage of donated value with complete allocation trails;
- number and value of flagged claims;
- repeat-donor rate after viewing a transparency report;
- time required to prepare an audit package.

## 14. Future roadmap

### Phase 1 — Hackathon prototype

Proof registry, trace explorer, document-integrity check, and auditor attestation.

### Phase 2 — Pilot with one NGO

Secure document storage, real user accounts, multi-reviewer workflow, campaign exports, and notifications.

### Phase 3 — Financial reconciliation

Bank/payment references, vendor verification, digital signatures, and accounting-system integration.

### Phase 4 — Ecosystem adoption

Reusable NGO transparency profiles, standardized proof exports, external audit partners, and privacy-preserving disclosure where required.

## 15. Three-minute pitch narrative

### 0:00–0:20 — The trust gap

> “A donor receives a payment confirmation, but usually cannot inspect what happens afterward. Financial reports ask the donor to trust a summary. TRACE Proof lets the donor inspect the evidence trail.”

### 0:20–0:45 — Campaign overview

Show the Maharashtra Flood Relief campaign and its utilization and review-coverage metrics.

### 0:45–1:25 — Trace the featured donation

Search for `DON-8F42A1`. Follow it through three allocations and open the food-supplies expense.

### 1:25–2:00 — Demonstrate tamper evidence

Select the original receipt and show `Hash matched`. Select the altered copy and show `Hash mismatch`.

Explain that this proves file integrity, not the truth of the original receipt.

### 2:00–2:30 — Show independent review

Switch to the auditor role, attest to the expense, and show the reviewer address and blockchain transaction.

### 2:30–2:50 — Explain the architecture

One sentence each:

- Blockchain preserves proof events and signers.
- Receipt hashes reveal later document changes.
- The public interface translates technical evidence into a usable trail.

### 2:50–3:00 — Close

> “TRACE Proof does not ask donors to trust a dashboard. It lets them inspect the evidence behind every utilization claim.”

## 16. Likely judge questions

### “Why not use a normal database?”

A database is useful for operations, but its administrator can edit its history. TRACE anchors proof events and responsible signers to a publicly inspectable ledger while keeping large documents off-chain.

### “Does the hash prove that a receipt is real?”

No. It proves that the checked file matches the file originally anchored. Authenticity requires organizational controls and independent review, which is why the platform includes separate auditor attestation.

### “Are you actually tracking every rupee?”

We track the declared allocation and utilization trail. Because money is fungible, we do not claim to trace a physical rupee. We make the organization's claims and supporting evidence tamper-evident and reviewable.

### “What prevents an NGO from entering false data?”

Blockchain cannot prevent false input. It makes the submitter, timing, evidence hash, and subsequent review visible. A production version would add verified identities, multiple reviewers, payment reconciliation, and legal accountability.

### “Why is the document not stored on-chain?”

Documents are large, costly to store publicly, and may contain sensitive data. Only the digest is anchored; this is enough to detect whether a later file is identical.

### “How will this scale?”

Store compact proofs and state transitions on-chain while keeping search indexes, permitted documents, and analytics off-chain. Events can be indexed by a backend without making that backend the source of proof.

## 17. Final product principle

Do not try to make the judges remember ten features. Make them remember three properties:

1. **Traceable:** allocations and expenses form an understandable public trail.
2. **Tamper-evident:** anchored evidence can be checked for later modification.
3. **Accountable:** every submission and review has a visible signer and timestamp.
