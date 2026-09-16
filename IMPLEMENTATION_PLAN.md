# TRACE Proof — 10-Hour Implementation Plan

## 1. Mission

Deliver a polished, reliable prototype for WB-05 that demonstrates one complete trust flow:

```text
View campaign
→ trace a donation
→ inspect an expense
→ verify a receipt hash
→ record or display an auditor attestation
→ inspect blockchain evidence
```

The project is successful when this single path works smoothly in a three-minute demo. Every other feature is secondary.

## 2. Definition of done

By the end of the build, the team must have:

- a public campaign page;
- a Trace Explorer with the seeded `DON-8F42A1` story;
- a working SHA-256 receipt-integrity check;
- one deployed proof-registry contract;
- at least one genuine, confirmed testnet transaction;
- visible transaction hashes and explorer links;
- an NGO expense-submission path or a convincingly demonstrated seeded submission;
- an auditor attest/flag action;
- useful loading, pending, confirmed, mismatch, and failure states;
- a README with setup, architecture, limitations, and AI-use disclosure;
- the required presentation using the organizer's template;
- screenshots and a recorded backup demo;
- a clear Git commit history created during the permitted development window.

## 3. Scope priority

### P0 — mandatory

- Seeded campaign page
- Trace Explorer
- Receipt hashing and comparison
- ProofRegistry contract
- One real testnet deployment and confirmed transaction
- Auditor attestation status
- README, PPT, and demo backup

### P1 — build only after P0 works

- Live NGO expense submission
- Live auditor transaction
- Contract event reading in the UI
- Responsive layout
- Copy-to-clipboard and explorer links

### P2 — only if the project is stable

- Search suggestions
- Additional campaign
- Small utilization chart
- Theme transition or subtle animation
- Hosted document storage

### Explicitly forbidden during the 10-hour build

- AI features
- Real payment processing
- Full authentication
- DAO/token/NFT features
- Multiple networks
- Complex dashboards
- New features after Hour 8

## 4. Recommended stack

Use familiar tools. Do not change frameworks during the build.

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite + TypeScript | Fast local iteration and simple deployment |
| Styling | Tailwind CSS | Consistent UI without writing a large stylesheet |
| Icons | Lucide React | Lightweight, clear status icons |
| Web3 | ethers.js | Contract reads, writes, and wallet connection |
| Contract | Solidity + Hardhat | Small contract, deployment, and unit tests |
| Hashing | Browser Web Crypto API | No server required for SHA-256 |
| Data | Local typed seed data initially | Reliable demo with minimal failure surface |
| Network | One EVM testnet | Only one network should be configured and demonstrated |
| Deployment | One static frontend host | Reduce deployment complexity |

Avoid PostgreSQL and Express for the MVP unless the complete P0 experience is already working. They add deployment and synchronization risk without strengthening the central proof.

## 5. Proposed repository structure

```text
trace-proof/
├── README.md
├── .env.example
├── docs/
│   ├── architecture.md
│   └── demo-script.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── ProofEvent.tsx
│   │   │   ├── MoneyTrail.tsx
│   │   │   └── HashVerifier.tsx
│   │   ├── pages/
│   │   │   ├── CampaignPage.tsx
│   │   │   ├── TraceExplorer.tsx
│   │   │   ├── SubmitProof.tsx
│   │   │   └── ReviewExpense.tsx
│   │   ├── data/demo.ts
│   │   ├── lib/contract.ts
│   │   ├── lib/hashFile.ts
│   │   ├── lib/format.ts
│   │   └── types/index.ts
│   └── ...
└── contracts/
    ├── contracts/ProofRegistry.sol
    ├── scripts/deploy.ts
    ├── test/ProofRegistry.ts
    └── ...
```

If a monorepo setup begins consuming time, keep `frontend` and `contracts` as independent projects with separate commands.

## 6. Minimal data model

Use stable string IDs in the UI and convert them to `bytes32` values for the contract.

```ts
type ReviewStatus = "unreviewed" | "attested" | "flagged";

interface Campaign {
  id: string;
  name: string;
  purpose: string;
  targetPaise: bigint;
  receivedPaise: bigint;
  utilizedPaise: bigint;
}

interface Donation {
  id: string;
  campaignId: string;
  amountPaise: bigint;
  donorLabel: string;
  recorderAddress: string;
  transactionHash: string;
  recordedAt: string;
}

interface Allocation {
  id: string;
  donationId: string;
  category: string;
  amountPaise: bigint;
}

interface Expense {
  id: string;
  allocationId: string;
  vendorLabel: string;
  description: string;
  amountPaise: bigint;
  receiptHash: string;
  transactionHash: string;
  submittedBy: string;
  reviewedBy?: string;
  status: ReviewStatus;
}
```

### Data rules

- Currency is represented in integer paise.
- UI formatting is separate from stored values.
- Donation IDs, allocation IDs, and expense IDs are immutable.
- The seeded data must obey all amount constraints.
- The UI must never show utilization greater than recorded donations.

## 7. Contract requirements

### Roles

- `owner`: configures the prototype's authorized NGO and auditor addresses.
- `ngo`: records donations, allocations, and expense proofs.
- `auditor`: attests to or flags expenses.

For a short prototype, simple address checks are sufficient. Avoid adding a large permissions library unless the team already knows it well.

### Required write functions

```solidity
recordDonation(donationId, campaignId, amountInPaise)
recordAllocation(allocationId, donationId, amountInPaise, categoryHash)
submitExpense(expenseId, allocationId, amountInPaise, receiptHash)
reviewExpense(expenseId, status)
```

### Required checks

- Reject zero amounts.
- Reject empty IDs.
- Reject reused IDs.
- Reject unauthorized callers.
- Reject allocations above a donation's remaining balance.
- Reject expenses above an allocation's remaining balance.
- Reject review of a nonexistent expense.
- Reject `Unreviewed` as a review decision.

### Minimum tests

1. Authorized NGO records a donation.
2. Duplicate donation ID is rejected.
3. Unauthorized account cannot submit an expense.
4. Over-allocation is rejected.
5. Over-spending an allocation is rejected.
6. Authorized auditor attests to an expense.
7. Unauthorized account cannot review an expense.
8. Emitted events contain the expected IDs and signer.

Do not begin UI contract integration until these tests pass.

## 8. Receipt-integrity flow

Calculate the digest locally so the file does not need to leave the browser.

```text
User selects file
→ browser reads bytes
→ SHA-256 digest is calculated
→ digest is compared with anchored receiptHash
→ show Match or Mismatch
```

### Required interface states

- No file selected
- Calculating hash
- Hash matched
- Hash mismatch
- File read failed

### Required explanatory copy

For a match:

> This file matches the SHA-256 digest anchored for this expense. This confirms file integrity, not the truth of the original document.

For a mismatch:

> This file does not match the anchored digest and may be a different or modified document.

Prepare both an original and a visibly edited sample receipt before rehearsal.

## 9. UI acceptance criteria

### Campaign page

- Loads without a wallet.
- Presents the campaign and trust metrics above the fold.
- Links directly to the featured trace.
- Clearly distinguishes utilized, reviewed, and flagged values.

### Trace Explorer

- `DON-8F42A1` returns the complete story.
- An unknown ID produces a useful empty state.
- Allocation totals are visually understandable in under five seconds.
- Each expense exposes hash, signer, timestamp, status, and transaction link.
- Long hashes never break the layout.

### Submit Proof

- Displays the connected address and expected NGO role.
- Rejects missing or invalid amounts before wallet confirmation.
- Shows wallet-request, submitted, confirmed, and failed states.
- Prevents accidental double submission while pending.

### Review Expense

- Displays the exact claim being reviewed.
- Makes `Attest` and `Flag` visually distinct.
- Requires an explicit confirmation before sending.
- Shows the reviewer's address after confirmation.

### Accessibility and responsiveness

- All controls work by keyboard.
- Status is communicated with text and icon, not color alone.
- Contrast remains readable on a projector.
- The demo works at 1280×720 and on a typical laptop viewport.

## 10. Ten-hour execution schedule

This schedule assumes a small team. Assign named owners before starting. If working alone, follow the same order and skip parallel tasks.

### 00:00–00:30 — Scope lock and repository setup

Deliverables:

- Confirm the one-sentence pitch.
- Create the repository and initial README.
- Add the AI-use disclosure.
- Add task ownership.
- Create the React and contract projects.
- Commit: `chore: initialize TRACE Proof prototype`

Scope gate: no feature enters the project unless it directly improves the three-minute demo.

### 00:30–02:00 — Build the hero experience first

Deliverables:

- App shell and visual tokens
- Campaign page
- Trace Explorer with seeded data
- Money trail and proof timeline
- Status badges and shortened hashes
- Unknown-search state
- Commit: `feat: add campaign and donation trace experience`

Checkpoint: a teammate unfamiliar with the project should understand the ₹10,000 trail without explanation.

### 02:00–03:15 — Implement and test the proof registry

Deliverables:

- Contract roles and record structures
- Four required write functions
- Amount and uniqueness checks
- Events
- Minimum test suite
- Commit: `feat: implement tested on-chain proof registry`

Abort condition: if a sophisticated data structure is difficult, simplify it. Do not remove uniqueness, authorization, or amount checks.

### 03:15–04:00 — Deploy and preserve evidence

Deliverables:

- Deploy once to the selected testnet
- Record network name, chain ID, contract address, deployer, and explorer URL
- Send at least one proof transaction
- Save confirmed hashes in demo data and README
- Export the ABI to the frontend
- Commit: `chore: deploy proof registry to testnet`

Checkpoint: open the contract and transaction in the explorer from a clean browser session.

### 04:00–05:15 — Implement receipt hashing

Deliverables:

- Browser SHA-256 utility
- Original sample receipt
- Visibly modified sample receipt
- HashVerifier component
- Match, mismatch, loading, and error states
- Explanatory limitation copy
- Commit: `feat: add client-side receipt integrity verification`

Checkpoint: demonstrate both a match and mismatch without network access.

### 05:15–06:30 — Integrate one live write path

Preferred path:

```text
NGO submits expense → wallet confirms → UI shows transaction → trace updates
```

Deliverables:

- Wallet/network state
- Form validation
- Contract write
- Pending and confirmed states
- Explorer link
- Commit: `feat: connect expense proof submission to contract`

Fallback: if live integration exceeds 75 minutes, preserve the pre-confirmed expense transaction and make contract reads plus receipt verification reliable. Document the limitation honestly.

### 06:30–07:15 — Add auditor review

Deliverables:

- Auditor role screen
- Attest and flag actions
- Reviewer address and timestamp
- Live write if stable; otherwise read and display a pre-confirmed review event
- Commit: `feat: add independent expense review flow`

### 07:15–08:00 — Reliability pass

Test:

- no wallet installed;
- wallet on the wrong network;
- rejected wallet request;
- slow transaction;
- unknown donation ID;
- hash mismatch;
- long address and hash values;
- refresh on every route;
- contract read/RPC failure.

Add friendly recovery instructions rather than raw errors.

Commit: `fix: harden demo flow and failure states`

**Feature freeze begins at Hour 8.**

### 08:00–08:45 — Visual and accessibility polish

Deliverables:

- Projector-readable contrast and font sizes
- Consistent spacing
- Responsive check
- Keyboard focus states
- Final wording audit for defensible claims
- Commit: `style: polish presentation and accessibility`

Remove incomplete elements instead of leaving disabled or fake controls.

### 08:45–09:20 — Submission materials

Deliverables:

- Finish README
- Produce architecture diagram
- Fill the official PPT template
- Capture screenshots
- Add contract/explorer links
- Verify repository access
- Commit: `docs: add architecture demo and AI disclosure`

### 09:20–10:00 — Record, rehearse, and freeze

Deliverables:

- Record a clean three-minute demo
- Run the live demo twice from a fresh browser
- Verify all submitted links
- Download or preserve an offline copy of essential artifacts
- Tag or note the final demo commit

No code changes in the final 15 minutes unless the demonstrated path is broken.

## 11. Team allocation

### Two-person team

| Member | Primary responsibility |
|---|---|
| A | Frontend, trace explorer, hashing, visual polish |
| B | Contract, tests, deployment, wallet integration, technical documentation |

Both members rehearse the demo and review the claims.

### Three-person team

| Member | Primary responsibility |
|---|---|
| A | Trace Explorer and campaign UI |
| B | Contract, tests, deployment, integration |
| C | Receipt flow, QA, README, PPT, video preparation |

### Four-person team

| Member | Primary responsibility |
|---|---|
| A | Design system and campaign UI |
| B | Trace Explorer and receipt verification |
| C | Contract, tests, deployment, wallet integration |
| D | QA, seeded data, documentation, PPT, demo direction |

Do not let several people edit the same file at the same time. Integrate at the end of each scheduled block.

## 12. Git strategy and rule compliance

The event rules require a clear development history. Use honest, incremental commits throughout the permitted window.

Recommended commit sequence:

```text
chore: initialize TRACE Proof prototype
feat: add campaign and donation trace experience
feat: implement tested on-chain proof registry
chore: deploy proof registry to testnet
feat: add client-side receipt integrity verification
feat: connect expense proof submission to contract
feat: add independent expense review flow
fix: harden demo flow and failure states
style: polish presentation and accessibility
docs: add architecture demo and AI disclosure
```

Rules:

- Do not rewrite or fabricate commit history.
- Do not backdate commits.
- Push periodically so development is externally visible.
- Keep meaningful messages; avoid one giant final commit.
- Do not commit private keys, seed phrases, API secrets, or funded credentials.
- Include `.env.example`, not `.env`.
- State how AI was used in both README and PPT.

Suggested disclosure:

> AI tools were used for ideation, scope review, documentation support, and selected code assistance. The team reviewed, adapted, tested, and integrated all submitted work during the official development period.

Adjust this sentence so it accurately reflects actual usage.

## 13. Demo resilience plan

### Live path

- Open the deployed frontend.
- Search the featured donation.
- Verify the original and modified receipt files.
- Execute one wallet action if the network is responsive.
- Open the confirmed transaction on the explorer.

### Fallback A — network or faucet problem

- Use pre-confirmed transaction hashes created during the build.
- Read the existing proof from the contract.
- Continue with local hash verification.

### Fallback B — wallet problem

- Show the already confirmed proof and signer.
- Use screenshots of the wallet-confirmation step.
- Do not pretend a prerecorded action is live.

### Fallback C — hosting problem

- Run the production build locally.
- Keep a screen recording and screenshots ready.

### Demo kit

- Original sample receipt
- Modified sample receipt
- Testnet wallet already configured
- Sufficient testnet currency
- Contract address and explorer links in a plain text note
- Local production build
- Demo recording
- PPT exported to both presentation and PDF formats

## 14. Three-minute live-demo script

### 0:00–0:20

> “A donation receipt proves that money was given. It does not show what happened afterward. TRACE Proof creates a public evidence trail from donation record to reviewed expense.”

### 0:20–0:45

Show the campaign page and explain utilization and review coverage. Avoid explaining the technology yet.

### 0:45–1:20

Search `DON-8F42A1`, show its ₹10,000 amount, and follow the three allocation branches.

### 1:20–1:55

Open the food expense. Verify the original file, then the altered file. State:

> “The hash proves whether the file changed after it was anchored. It does not, by itself, prove that the original receipt was truthful.”

### 1:55–2:25

Show the auditor's separate attestation, signer address, timestamp, and explorer transaction.

### 2:25–2:45

Show the architecture slide:

- documents remain off-chain;
- compact hashes and proof events are on-chain;
- the interface makes the evidence readable.

### 2:45–3:00

> “TRACE Proof does not ask donors to trust a dashboard. It lets them inspect the evidence behind every utilization claim.”

Stop there. Do not dilute the ending with more features.

## 15. PPT outline

Use the organizer-provided template without changing required sections.

1. Title and one-line pitch
2. Problem and trust gap
3. Existing reporting limitations
4. TRACE Proof solution and user flow
5. Hero trace screenshot
6. Trust model: claim, hash, and attestation
7. Architecture and on-chain/off-chain split
8. Technology stack
9. Live-demo results and contract links
10. Limitations and threat model
11. Impact, feasibility, and roadmap
12. Team contributions and AI-use disclosure

Keep the slide deck visual. The live product should carry the detailed explanation.

## 16. README checklist

- Project name and problem statement
- One-line pitch
- Screenshots or short GIF
- Features and excluded scope
- Architecture diagram
- What is on-chain and off-chain
- Contract address, network, and explorer link
- Local setup commands
- Environment-variable documentation
- Test commands and test summary
- Demo IDs and instructions
- Security and product limitations
- Roadmap
- Team members and contributions
- Accurate AI-use disclosure
- License if required

## 17. Risk register

| Risk | Probability | Impact | Mitigation |
|---|---:|---:|---|
| Testnet transaction is slow | Medium | High | Preserve confirmed demo records and make live write optional |
| Wallet is on wrong network | High | Medium | Detect chain ID and provide one-click network guidance |
| Faucet funds unavailable | Medium | High | Fund the demo wallet early and avoid repeated deployments |
| Contract bug blocks integration | Medium | High | Keep the contract small and test invariants before deployment |
| Hosting fails | Medium | High | Keep a local production build and recorded demo |
| Receipt claim is challenged | High | Medium | Clearly distinguish file integrity from authenticity |
| “Track every rupee” claim is challenged | High | High | Say “verifiable allocation trail” and explain fungibility |
| Team overbuilds | High | High | P0/P1/P2 scope and mandatory Hour-8 feature freeze |
| Presentation is unfinished | Medium | High | Start the official template early and reserve the final 75 minutes |
| Secrets enter Git | Medium | High | `.gitignore`, `.env.example`, and repository scan before push |

## 18. Final pre-submission checklist

### Product

- [ ] Featured donation opens correctly
- [ ] Allocation and expense totals reconcile
- [ ] Original receipt produces a hash match
- [ ] Modified receipt produces a mismatch
- [ ] Auditor status and signer are visible
- [ ] Explorer links open correctly
- [ ] No unsupported “authentic” or “every rupee” claims remain
- [ ] Failure states are understandable

### Blockchain

- [ ] Contract address is correct
- [ ] Network and chain ID are documented
- [ ] At least one confirmed transaction is preserved
- [ ] Contract tests pass
- [ ] No secret key or seed phrase is committed

### Submission

- [ ] Repository is accessible
- [ ] README is complete
- [ ] AI usage is disclosed
- [ ] Official PPT template is used
- [ ] PPT links work
- [ ] Demo recording plays with sound
- [ ] Live URL works, if submitted
- [ ] Backup screenshots and local build are available

### Pitch

- [ ] Demo is under three minutes
- [ ] Every team member knows the trust limitations
- [ ] Presenter can answer “Why blockchain?” in under 20 seconds
- [ ] Presenter can explain hash integrity versus authenticity
- [ ] Closing line is rehearsed

## 19. Decision rule during development

When choosing between two tasks, select the task that makes this path more reliable or understandable:

```text
Donation → allocation → expense → receipt hash → auditor → public proof
```

If a task does not strengthen that path, it waits until after the hackathon submission.
