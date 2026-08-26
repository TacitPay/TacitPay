# TacitPay — Private Invoicing & Settlement on Midnight

**Product Requirements Document (PRD) — Midnight Buildathon 2026 (AKINDO WaveHack), Waves 1–3**

| Field | Value |
|---|---|
| Document version | 1.2 (2026-08-23; scope additions: milestone escrow, claim-based refunds, recurring invoices, receivables proofs, judge sandbox) |
| Status | Approved for implementation |
| Target chain | Midnight (Ledger 8.0; Compact language 0.23 / compiler 0.31; Midnight.js 4.0.x) |
| Networks | Local devnet → **Preview** (primary public target; testnet USDM lives here) → Mainnet with USDM (Wave 3 stretch) |
| Program | Midnight Buildathon, Aug 27 – Nov 27, 2026, hosted on AKINDO |
| Author | marcustan88 (team lead / sole builder unless stated otherwise) |
| Working name | **TacitPay** ("tacit" = understood without being stated). The name is a placeholder; rename freely, but keep it consistent across repo, README, deck, and video. |

> **For Claude Code (read this first).** This document is the single source of truth for the project. It is written so that you can implement every wave without asking the author for clarification. Where a decision depends on a fact that can only be confirmed against the live toolchain, the document gives you a *decision rule* (look for blocks labelled **VERIFY**) instead of a guess. Follow the rules in §0 before writing any code.

---

## 0. Operating rules for the implementing agent

These rules override your training data whenever the two disagree.

1. **Never guess a Midnight/Compact API.** Your training data for Compact is stale and frequently wrong. Every Compact construct, standard-library circuit, Midnight.js function, and package name used in this project must be confirmed against one of:
   - the official docs index: https://docs.midnight.network/llms.txt (machine-readable list of every docs page), or
   - the real compiler output (`compact compile`), or
   - the Midnight Expert Claude Code plugins (§0.2).
2. **Install and use Midnight Expert.** It is the official Claude Code plugin suite from the Midnight team. Install it first, run its doctor, and use `/midnight-verify:verify "<claim>"` for every **VERIFY** item in this document before you build on that assumption. Docs: https://docs.midnight.network/ai-integration/midnight-expert
   ```bash
   curl -fsSL https://midnightntwrk.expert/install.sh | bash
   # then inside Claude Code:
   /midnight-expert:doctor
   /midnight-tooling:doctor
   ```
3. **Compile after every contract change.** A Compact contract that does not compile is an automatic disqualification for the wave (§2.4). `compact compile <file>.compact <outdir>` must succeed with no skip flags before you move on.
4. **Pin versions from the compatibility matrix**, not from memory: https://docs.midnight.network/relnotes/support-matrix . The versions observed on 2026-08-22 are listed in §12.1; re-check the matrix at the start of each wave and upgrade deliberately (record the upgrade in the wave changelog).
5. **Private data never touches the public ledger in plaintext.** §4.4 lists the privacy invariants. Every circuit and every ledger field you add must be checked against that list. If you are about to `disclose()` something, first ask "is this in the allowed-public list (§4.3)?" If not, stop and redesign.
6. **Tests are a deliverable, not an afterthought.** Quality Assurance is 15% of the score and judges explicitly look for simulation/test files that pass (§2.3). Every circuit gets unit tests (success + failure paths) before the frontend is touched.
7. **Work in the order given in §14 (day plan).** The order is chosen so the riskiest unknowns (shielded coin custody) are resolved in the first three days, when there is still time to change design.
8. **Keep a running `docs/WAVE-CHANGELOG.md`.** The buildathon requires "a clear explanation of what has changed since the previous submission" for Waves 2 and 3. Append to it as you go, not at the end.
9. **Licensing.** All Midnight-related code (the Compact contract and everything needed to evaluate it) must be Apache-2.0 (§2.5). Put `LICENSE` (Apache-2.0) at the repo root on day 1.
10. **If something in this document is contradicted by the official docs or compiler, the docs/compiler win.** Record the discrepancy in `docs/DECISIONS.md` with the URL you used and what you changed.

### 0.1 Vocabulary used in this document

| Term | Meaning |
|---|---|
| Merchant | The party who creates an invoice and receives funds. |
| Payer | The party who pays an invoice. |
| Verifier | Anyone who checks an invoice status or a selective-disclosure proof (auditor, accountant, lender, the payer's own records). |
| Invoice ID | A 32-byte random identifier, public. Generated client-side. |
| Invoice commitment | `persistentCommit(InvoiceBody, salt)` — a hiding commitment to the private invoice fields. Public. |
| Owner tag | `persistentHash([merchantPubKey, invoiceId])` — lets the merchant prove ownership of *one* invoice without linking their invoices together. Public. |
| Payer tag | `persistentHash([payerPubKey, invoiceId])` — lets a payer later prove *they* paid, without revealing identity at payment time. Public. |
| Shielded coin | A Zswap (private) coin. Amounts and owners are hidden on-chain. See https://docs.midnight.network/concepts/zswap |
| Variant A / Variant B | Two escrow designs for holding the paid coin until withdrawal; see §6.5. |
| Milestone invoice | An invoice whose escrow release is gated on payer approval or a timeout (`releaseAfter`/`released` fields). See §15.5. |
| Release approval | The payer's `approveRelease` circuit call that unlocks a milestone invoice's escrow for withdrawal. |
| Series | A recurring-invoice chain derived client-side from a secret series seed; children are unlinkable on-chain. See §15.7. |

### 0.2 Tools you will use

| Tool | Purpose | Docs |
|---|---|---|
| `compact` CLI | Compile contracts to circuits + TS bindings | https://docs.midnight.network/getting-started/installation |
| Proof server (Docker `midnightntwrk/proof-server:8.1.0`) | Generates ZK proofs locally | https://docs.midnight.network/guides/run-proof-server |
| `midnight-local-dev` | Local node + indexer + proof server, pre-funded wallets | https://github.com/midnightntwrk/midnight-local-dev and https://docs.midnight.network/guides/networks-and-environments |
| Midnight.js 4.x (`@midnight-ntwrk/midnight-js-*`) | Providers, deploy, call circuits | https://docs.midnight.network/api-reference/midnight-js |
| Wallet SDK (`@midnight-ntwrk/wallet-sdk`) | Programmatic wallets (CLI, tests, MCP server) | https://docs.midnight.network/relnotes/wallet |
| DApp Connector API 4.x (`@midnight-ntwrk/dapp-connector-api`) | Browser ↔ Lace wallet | https://docs.midnight.network/api-reference/dapp-connector |
| Lace wallet (Chrome) with Midnight support | End-user wallet for the demo | https://docs.midnight.network/guides/acquire-tokens |
| Midnight Expert (Claude Code plugins) | Verified Compact generation and review | https://docs.midnight.network/ai-integration/midnight-expert |
| Testkit (`@midnight-ntwrk/testkit-js`) | Test environments, wallet factories, faucet client | https://docs.midnight.network/api-reference/testkit-js |

---

## 1. Product summary

**One sentence.** TacitPay lets a merchant issue an invoice and get paid in a stablecoin on Midnight so that *anyone* can verify the invoice was settled, while the amount, the counterparties, and the invoice contents stay private — and the merchant can later prove facts about their revenue (e.g. "I received ≥ X this quarter") to an auditor without revealing the underlying invoices.

**Three paragraphs (use verbatim in README / deck where useful).**

TacitPay is a private invoicing and payment protocol on Midnight, built around USDM, the regulated stablecoin that went live on the chain in August 2026. A merchant creates an invoice, and what lands on the public ledger is only a commitment — a hash of the amount, the memo and a random salt — plus an open/paid flag. The actual amount, the counterparty and the invoice details live in the merchant's private state on their own device. A payer opens the invoice link, their wallet reconstructs the commitment, the Compact contract verifies it matches, and a shielded token transfer settles it. Both sides keep a cryptographic receipt in private state. Anyone can verify that a given invoice was paid; nobody can see what it was for, how much it was, or who paid it. That is the Midnight dual-ledger model applied to the most common business transaction there is.

Privacy is load-bearing here for one reason: businesses will not put their revenue, customer list and pricing on a public ledger, which is why on-chain stablecoin payments remain a hobbyist thing despite mature rails. Every public-chain payment is a permanent disclosure of who you sell to and for how much. But businesses also cannot use a fully anonymous system, because they need to prove things to accountants, auditors, tax authorities and lenders. That is the second half of the product and the part only Midnight makes possible: selective disclosure as a ZK circuit. A merchant can prove "I received at least X this quarter" or "this invoice was paid before its due date" to an auditor without revealing individual transactions. A payer can prove "I paid invoice #123" as proof of purchase without the chain ever linking them to it.

The buildathon strategy is to ship a complete, boring, working loop in Wave 1 — create invoice, pay with a shielded token, merchant withdraws, receipts, simulator tests that pass, a minimal UI and a clean README — and then compound product surface across Waves 2 and 3: an MCP server so invoices can be created from an AI client, a Node SDK and hosted checkout, a merchant dashboard, the audit-proof circuits, and mobile. The contract is deliberately simple; the score comes from private-state design done properly, passing tests, a demo that works first time, and a visible changelog every wave.

### 1.1 Non-goals (all waves)

- No fiat on/off-ramp, no KYC, no custody of user keys by any server.
- No attempt to hide *that* a contract call happened; Midnight is not an anonymity coin (see positioning, §3.3).
- No multi-currency conversion or oracles.
- No on-chain storage of memo text, line items, or customer data — ever.
- No general marketplace, reviews, or reputation features (explicitly rejected during scoping).

---

## 2. Buildathon context and hard constraints

Source of truth: the AKINDO program page ("Build Privacy-First Apps on Midnight") and the Official Rules PDF linked from it. If anything below conflicts with the AKINDO page or the Official Rules, those prevail.

### 2.1 Schedule

| Wave | Build period | Judging | Grant pool |
|---|---|---|---|
| Wave 1 | Aug 27 – Sep 16, 2026 | Sep 16 – Sep 27 | US$3,500 |
| Wave 2 | Sep 27 – Oct 17, 2026 | Oct 17 – Oct 27 | US$4,000 |
| Wave 3 | Oct 27 – Nov 16, 2026 | Nov 16 – Nov 27 | US$5,000 |

Kickoff workshop: Aug 26, 2026, 22:00 JST (13:00 UTC), online; recording shared afterward. Attend it and add any judge guidance to `docs/DECISIONS.md`.

The exact submission deadline *time* for each wave is displayed on the AKINDO platform; treat the displayed time as binding and submit at least 12 hours before it. Only the version submitted by the deadline counts for that wave.

Grants are distributed **in proportion to judging points** across all eligible submissions, so the strategy is: maximize points every wave, and submit all three waves.

### 2.2 Submission requirements (per wave)

Each submission on AKINDO must include:

1. Link to a **public GitHub repository** with the project code.
2. A clear **README** explaining the project, setup, architecture, Midnight integration, and how judges can test/evaluate it.
3. A **slide deck** (pitch presentation).
4. A **demo / video pitch**.
5. A **description of progress completed during the wave**.
6. For Waves 2 and 3: a **clear explanation of what changed** since the previous submission.
7. The repository must carry the **`midnightntwrk` label/topic on GitHub**.
8. Midnight-related code under **Apache License 2.0**.
9. If requested by judges: participate in a live presentation/interview.

### 2.3 Judging rubric (weights)

| Criterion | Weight | What judges look at (from the program page) |
|---|---|---|
| Engineering & Implementation | **40%** | Compact contract compiles; includes **private-state management**; demonstrates understanding of the **dual-ledger model**; repo well organized with a clear README; repo tagged with Midnight topics and ecosystem attribution. |
| Quality Assurance & Reliability | **15%** | Presence of **simulation and test files**, whether tests pass, stability under basic use. |
| Product & Vision | 15% | Strength of idea, connection to Midnight's core capabilities, realistic scope and roadmap. |
| User Experience & Design | 15% | Frontend intuitive, behaves as expected, **connects to the contract end-to-end**. |
| Communication | 10% | Clarity/structure of video and deck. |
| Business Development & Viability | 5% | Target audience awareness, market potential, adoption path. |

Implication: 55% of the score is the contract + tests. Frontend polish matters (15%) but only once the contract loop is solid.

### 2.4 Technical gate (automatic disqualification if missed)

- At least one Compact contract that **compiles successfully**.
- Meaningful Midnight-related functionality (not a fork/copy/superficial modification of an existing project).
- `midnightntwrk` label on GitHub.
- Public repo + slide deck + demo video.
- Licensing/eligibility/submission requirements satisfied.

### 2.5 Rules that affect engineering decisions

- Existing libraries/frameworks may be used, but the Midnight-related functionality must be **newly developed during the wave**. Do not copy code from other projects' repos; implement everything from scratch.
- Wave-to-wave resubmission must show **meaningful new progress** completed during that wave.
- Apache-2.0 for the Compact contract and all code "reasonably necessary to evaluate its functionality" — in practice, the whole repo.
- Teams up to 5; every member registers on AKINDO individually.

---

## 3. Problem, users, positioning

### 3.1 Problem

On transparent chains, every stablecoin payment permanently publishes: who paid whom, how much, and (via address clustering) a business's full revenue and customer list. That is why businesses that could benefit from instant, low-fee stablecoin settlement mostly don't use it. The opposite extreme — fully anonymous payments — is unusable for legitimate businesses, which must prove income and settlement to accountants, auditors, tax authorities and lenders.

### 3.2 Users

| Persona | Need | Wave in which they are served |
|---|---|---|
| **Merchant / freelancer** (primary; the author is one) | Get paid in a stablecoin without publishing books; keep records; prove settlement on request. | 1 |
| **Payer** (customer / client) | Pay an invoice from a wallet link; hold a receipt that proves payment without exposing identity at payment time. | 1 |
| **Verifier** (accountant, auditor, lender, marketplace) | Confirm an invoice is settled; later, verify an aggregate revenue proof without seeing individual invoices. | 1 (status), 3 (aggregate proofs) |
| **Developer / AI agent** | Create and track invoices programmatically (SDK, CLI, MCP). | 2 |

### 3.3 Positioning (use in deck and README)

- "**Private by default, provable on demand.**" Not an anonymity tool; a selective-disclosure tool. This matches Midnight's own framing (prove facts about data without revealing the data) and its federated-node partners (payments companies).
- Timing hook: **USDM (Cardano's regulated stablecoin) went live on Midnight mainnet in mid-August 2026** via VIA Labs' native transfer, and **testnet USDM (tUSDM) is available on Midnight Preview** through the same bridge. TacitPay is designed to be the first private invoicing rail for it. (Wave 1 demos with tNIGHT and, if the Day-4 spike succeeds, tUSDM; Wave 2 targets tUSDM on Preview; Wave 3 targets mainnet USDM — §16.2.)
- Strategy pattern: a simple, correct contract plus relentless product surface compounded across waves. TacitPay adds the part such products usually leave off-chain: selective-disclosure proofs as real ZK circuits.

### 3.4 Success metrics (for the team, not the rubric)

- Wave 1: end-to-end flow works on Preview with Lace, first try, in the demo video. ≥ 25 passing tests. Zero plaintext amounts in public contract state after withdrawal.
- Wave 2: SDK published to npm; MCP server creates an invoice from Claude Code in the video; Variant B escrow live (no plaintext amounts in public state at any time).
- Wave 2: a tUSDM invoice paid end-to-end on Preview in the video.
- Wave 3: an aggregate revenue proof verified on-chain in the video; USDM payment on mainnet *or* clearly documented reason it was not possible, with the Preview tUSDM flow as the fallback demo.
- Wave 2: a milestone invoice approved and withdrawn, a refund offered and claimed, and a second retainer period paid from one standing series link — all in the video.
- Wave 3: a "receivables ≥ X" claim verified on `/audit/<id>` alongside the revenue proof.

---

## 4. Privacy model

This section is the heart of the "how privacy meaningfully shapes the design" requirement. Put a condensed version of §4.2–4.4 in the README.

### 4.1 Parties and trust assumptions

- The **contract** is trusted to enforce rules (ZK-verified). It cannot see witness data.
- The **prover** sees witness data in the clear — this is inherent to ZK proving, not a Midnight limitation: you cannot prove a statement about secret inputs without holding them. Privacy therefore comes from the circuit and the dual-ledger design (what reaches the chain), while the prover's *location* decides who else learns the invoice along the way. Acceptable locations, best first: **in the user's browser** (1AM's WASM prover — nothing leaves the tab), **a local proof server** (Docker, `localhost:6300` — opens no network connections), or **a remote server the user themselves controls**, over TLS. Never point a user at a shared or TacitPay-operated prover: that party would see every amount and counterparty, which is precisely the trusted intermediary this product exists to remove (§1.1). See §8.3 for the feature-detected provider tiers. (https://docs.midnight.network/guides/local-proving , https://docs.midnight.network/guides/run-proof-server)
- The **indexer** sees only public state and shielded commitments/nullifiers.
- There is **no TacitPay backend** in Wave 1. Invoice details travel from merchant to payer inside the invoice link's URL fragment (`#…`), which browsers do not send to servers. Wave 2 adds an optional relay; it must never receive plaintext invoice bodies (§15.3).

### 4.2 What is hidden from whom

| Data | Public ledger | Payer | Merchant | Verifier with a proof |
|---|---|---|---|---|
| Invoice amount | **Hidden** (commitment only) | Known (from link) | Known | Only the fact being proved (e.g. "≥ X") |
| Memo / line items | Hidden (hash inside commitment) | Known | Known | Hidden |
| Merchant identity | Hidden (per-invoice owner tag, unlinkable across invoices) | Knows who sent them the link | — | Only if merchant chooses to prove ownership |
| Payer identity | Hidden (Zswap shielded payment; per-invoice payer tag) | — | Not learned from chain | Only if payer chooses to prove |
| Invoice exists + status (OPEN/PAID/WITHDRAWN/CANCELLED) | **Public** by design | Public | Public | Public |
| Count of invoices per merchant | Hidden (no public merchant key) | — | Known | Hidden |
| Escrowed coin value while awaiting withdrawal | Variant A (Wave 1): **visible in contract state** until withdrawal (documented limitation). Variant B (Wave 2): hidden. | — | — | — |

### 4.3 Allowed-public list (the only things that may ever be `disclose()`d)

1. `invoiceId` (random 32 bytes).
2. `commitment` (hiding commitment; already safe by construction — the compiler does not require `disclose` for `persistentCommit` outputs).
3. `ownerTag`, `payerTag` (hashes of a secret + invoiceId).
4. `status` enum and `expiresAt` (unix seconds; `0` = no expiry).
5. The token colour (`paymentToken`) configured at deployment.
6. Counters (`invoiceCount`, `paidCount`) — global, not per merchant.
7. Coin information passed to `receiveShielded`/`sendShielded`/`insertCoin` — required by the runtime. In Variant A this publishes the escrowed coin value in contract state (accepted Wave 1 limitation). In Variant B only a hash of the coin is stored.
8. Audit attestations (Wave 3): `{auditId, kind, thresholdOrPredicate, blockTime}` — the *claim*, never the data. `kind` distinguishes revenue (0) from receivables (1) claims (§16.4).
9. Milestone gate fields (Wave 2, §15.5): `releaseAfter` (unix seconds; `0` = standard invoice) and `released` (Boolean), plus the `REFUNDABLE`/`REFUNDED` statuses (§15.6). *That* an invoice is milestone-gated or refunded is public by design; amounts and parties remain hidden.

Anything else that originates from a witness or a circuit parameter must not be disclosed. If the compiler demands `disclose()` on something not on this list, the design is wrong — redesign, don't disclose.

### 4.4 Privacy invariants (write tests for each; see §11.4)

- **INV-1**: No ledger field ever contains an invoice amount in plaintext except the Variant A escrow entry, which must be removed on withdrawal. (Variant B: never.)
- **INV-2**: No ledger field contains a merchant public key or any value that is equal across two invoices of the same merchant.
- **INV-3**: A payer's wallet address / coin public key never appears in contract state.
- **INV-4**: Memo text never leaves the client; only `memoHash = sha256(memoText)` is committed.
- **INV-5**: Paying an invoice requires knowledge of the invoice preimage (amount, memoHash, salt) — i.e. possession of the link — *and* an actual shielded coin of the right value and colour in the same transaction (`receiveShielded`). Nobody can mark an invoice paid without paying.
- **INV-6**: Only the holder of the merchant secret for that invoice can withdraw or cancel (owner-tag check).
- **INV-7**: An invoice can be paid at most once (status machine; second payment fails).
- **INV-8**: Expired invoices cannot be paid.
- **INV-9** (Wave 2): A milestone invoice's escrow cannot be withdrawn before the payer's `approveRelease` unless `releaseAfter` has passed (timeout). Standard invoices (`releaseAfter = 0`) are unaffected.
- **INV-10** (Wave 2): An offered refund can only be claimed by the original payer (payer-tag check); nobody else can redirect the coin.
- **INV-11** (Wave 2): No public ledger value links two invoices of the same recurring series; child ids/salts derive from a secret seed and are indistinguishable from random.

### 4.5 Known privacy limitations (state them openly in README and video)

- Timing correlation: a `payInvoice` call and the Zswap output it claims land in the same transaction; an observer learns "some invoice got paid at time T", not amount or parties.
- Small anonymity sets early on are inherent to a new network.
- The merchant learns the payer's identity off-chain (they sent them the link) — this is normal commerce and not a chain leak.
- Variant A escrow exposure window (until Wave 2). This is more than a value leak: the escrowed `QualifiedShieldedCoinInfo` publishes the coin's **nonce**, so once the merchant withdraws, an observer who guesses the merchant's Zswap public key can recompute the withdrawal's coin commitment from public data and confirm the guess — permanently, in transaction history. While Variant A is live, a merchant's Zswap key is linkable across their withdrawn invoices (weakens INV-2 for the merchant side). Variant B (§6.5) closes this; until then, state it plainly in README/PRIVACY.

---

## 5. Architecture

### 5.1 Components

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Browser (Vite + React + TS)  packages/ui                                │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────┐ ┌─────────────────┐    │
│  │ Merchant     │ │ Pay page   │ │ Receipt /    │ │ Verify (public) │    │
│  │ dashboard    │ │ /pay#<frag>│ │ My payments  │ │ /verify/<id>    │    │
│  └──────┬───────┘ └─────┬──────┘ └──────┬───────┘ └────────┬────────┘    │
│         └───────────────┴───────────────┴──────────────────┘             │
│                         packages/api  (TacitPayApi: createInvoice,       │
│                         payInvoice, withdraw, cancel, status, receipts)  │
│   Midnight.js providers: privateState (encrypted LevelDB in browser),    │
│   publicData (indexer GraphQL), zkConfig (fetch), proof (local :6300),   │
│   wallet+midnight (DApp Connector → Lace)                                │
└───────────────┬──────────────────────────────┬───────────────────────────┘
                │ GraphQL (public state)        │ proofs (localhost:6300)
                ▼                              ▼
        Midnight Indexer                 Local proof server (Docker)
                ▲
                │
        Midnight Node  ◄──── transactions (via Lace / wallet SDK)
                ▲
                │
   contracts/tacitpay.compact  (public ledger: invoices Map, escrow,       │
   counters; circuits: createInvoice, payInvoice, withdraw, cancelInvoice, │
   + Wave 2/3 circuits)                                                    │

   packages/cli   — Node CLI: deploy, create/pay/withdraw for demos & tests
   packages/mcp   — (Wave 2) MCP server exposing invoice tools to AI clients
   packages/sdk   — (Wave 2) @tacitpay/node for merchants' own code
```

### 5.2 Dual-ledger mapping (put this table in the README)

| Layer | Holds | Why |
|---|---|---|
| **Public ledger (Compact `ledger` fields)** | `invoices: Map<invoiceId, InvoiceRecord{ownerTag, commitment, status, expiresAt, payerTag}>`, `escrow`, `paymentToken`, counters | Anyone can verify existence and status; nothing here reveals amount or parties. |
| **Zswap shielded ledger** | The payment coin itself (commitment + nullifier) | Amount and owner hidden by the protocol. |
| **Private state (client device, encrypted)** | Merchant: secret key, full invoice bodies, salts, memos. Payer: secret key, receipts (invoiceId, amount, salt, txId). | Witness inputs for proofs; never transmitted. |
| **Off-chain transport (URL fragment)** | Invoice link payload (contract address, invoiceId, amount, memo, salt, token, expiry) | Merchant → payer only; never sent to any server. |

### 5.3 Data flows

**Create invoice (merchant)**
1. UI generates `invoiceId = random32()`, `salt = random32()`, computes `memoHash = sha256(utf8(memo))`.
2. Calls circuit `createInvoice(invoiceId, amount, memoHash, salt, expiresAt)`. Witness `merchantSecret()` supplies the merchant secret from private state.
3. Contract stores `{ownerTag, commitment, OPEN, expiresAt, payerTag: zero}`.
4. On success the API writes the invoice body to merchant private state and returns the **invoice link**: `https://<host>/pay#<base64url(JSON payload)>`.

**Pay invoice (payer)**
1. Payer opens the link; UI decodes the fragment; shows amount/memo; asks to connect Lace.
2. UI checks on-chain status via indexer (must be OPEN, not expired).
3. UI builds the shielded coin to send to the contract (`ShieldedCoinInfo{nonce, color: paymentToken, value: amount}`) and calls `payInvoice(invoiceId, amount, memoHash, salt, coin)`. Witness `payerSecret()` supplies the payer secret (generated on first use and stored in private state).
4. Contract verifies commitment, checks coin colour/value, `receiveShielded(coin)`, stores coin in escrow, sets PAID and `payerTag`.
5. On success the API stores a receipt in payer private state.

**Withdraw (merchant)**
1. Dashboard lists PAID invoices (from private state, cross-checked with chain).
2. Calls `withdraw(invoiceId)`; contract checks owner tag, `sendShielded(escrowCoin → ownPublicKey())`, removes escrow entry, sets WITHDRAWN. Because the merchant is the transaction creator, their wallet is informed of the incoming coin (see the `sendShielded` note in the standard library: sending to a key other than the current user's does not inform that user — this is why the design is escrow + merchant-initiated withdrawal rather than pay-through).

**Verify (anyone)**
- `/verify/<invoiceId>` reads `invoices.lookup(invoiceId)` from the indexer and displays status + timestamps. No wallet needed.

---

## 6. Smart contract specification (`contracts/tacitpay.compact`)

Language: Compact `pragma language_version 0.23;` (compiler 0.31.x as of 2026-08-22 — confirm with `compact compile --version`). Reference pages you must read before writing the contract:

- Language reference index: https://docs.midnight.network/category/reference
- Standard library API (structs, `receiveShielded`, `sendShielded`, `persistentCommit`, `ownPublicKey`, `tokenType`, `nativeToken`, `blockTimeLt`…): https://docs.midnight.network/compact/standard-library/exports
- Ledger ADTs (`Map`, `Set`, `Counter`, `insertCoin`, `writeCoin`, `kernel.self()`): https://docs.midnight.network/compact/data-types/ledger-adt
- Opaque data types: https://docs.midnight.network/compact/data-types/opaque_data
- Worked examples with the exact syntax this project mirrors: token transfers https://docs.midnight.network/examples/contracts/token-transfers and private reserve auction https://docs.midnight.network/examples/contracts/private-reserve-auction
- Security guidance: https://docs.midnight.network/compact/smart-contract-security and https://docs.midnight.network/guides/security-best-practices

### 6.1 Types

```compact
pragma language_version 0.23;
import CompactStandardLibrary;

export enum InvoiceStatus { OPEN, PAID, WITHDRAWN, CANCELLED }

// Private body of an invoice; only its commitment is public.
struct InvoiceBody {
  amount: Uint<64>;      // smallest unit of paymentToken (e.g. STAR for NIGHT; 10^-6 for USDM)
  memoHash: Bytes<32>;   // sha256 of memo text, computed client-side
}

export struct InvoiceRecord {
  ownerTag: Bytes<32>;    // persistentHash([merchantPubKey, invoiceId])
  commitment: Bytes<32>;  // persistentCommit(InvoiceBody, salt)
  status: InvoiceStatus;
  expiresAt: Uint<64>;    // unix seconds; 0 = never
  payerTag: Bytes<32>;    // persistentHash([payerPubKey, invoiceId]); zero until paid
}
```

### 6.2 Ledger (public state)

```compact
export sealed ledger paymentToken: Bytes<32>;                 // token colour accepted for payment
export ledger invoices: Map<Bytes<32>, InvoiceRecord>;        // invoiceId -> record
export ledger escrow: Map<Bytes<32>, QualifiedShieldedCoinInfo>; // Variant A (Wave 1), see 6.5
export ledger invoiceCount: Counter;
export ledger paidCount: Counter;
```

`sealed` makes `paymentToken` immutable after the constructor (pattern from the reserve-auction example).

### 6.3 Witnesses (private inputs supplied by TypeScript)

```compact
witness merchantSecret(): Bytes<32>;   // from merchant private state
witness payerSecret(): Bytes<32>;      // from payer private state
```

Witness implementations live in `contracts/src/witnesses.ts` and return `[newPrivateState, value]` tuples (see https://docs.midnight.network/guides/compact-javascript-runtime).

### 6.4 Helper circuits (not exported)

```compact
circuit merchantPubKey(sk: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([pad(32, "tacitpay:merchant:"), sk]);
}

circuit payerPubKey(sk: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([pad(32, "tacitpay:payer:"), sk]);
}

circuit tagFor(pk: Bytes<32>, invoiceId: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([pk, invoiceId]);
}

circuit commitInvoice(body: InvoiceBody, salt: Bytes<32>): Bytes<32> {
  return persistentCommit<InvoiceBody>(body, salt);
}
```

`persistentHash`/`persistentCommit` are the SHA-256-based, upgrade-stable primitives the docs say to use for state-derived data. `persistentCommit` is documented as sufficient to hide its input, so its output may be stored without `disclose()`; `persistentHash` is **not** — hence the tags are computed from a secret-derived public key, and the public key (not the secret) is what we hash.

### 6.5 Escrow design: Variant A (Wave 1) vs Variant B (Wave 2)

The contract must hold the paid coin between `payInvoice` and `withdraw` because Compact's `sendShielded` to a user key other than the transaction creator does not notify that user's wallet (documented in the standard library reference). Withdrawal must therefore be a merchant-initiated transaction.

**Variant A — canonical custody (ship in Wave 1).**
`escrow: Map<Bytes<32>, QualifiedShieldedCoinInfo>`; `payInvoice` calls `escrow.insertCoin(invoiceId, coin, right<ZswapCoinPublicKey, ContractAddress>(kernel.self()))` right after `receiveShielded(coin)`; the runtime fills in the Merkle index. `withdraw` does `escrow.lookup(invoiceId)` → `sendShielded(...)` → `escrow.remove(invoiceId)`. This is exactly the pattern the ledger-ADT docs describe (`insertCoin` "must have been allocated within the current transaction"). Limitation: the `QualifiedShieldedCoinInfo` in the Map is public, so the escrowed value is visible until the merchant withdraws — and, worse, the public coin **nonce** turns the withdrawal into a Zswap-key oracle: an observer can test a guessed merchant key against the withdrawal's coin commitment recomputed from public data, permanently linking that merchant's withdrawals in history (see §4.5). `escrow.remove` does not undo this. Document it; sweep quickly in the demo; Variant B removes the exposure.

**Variant B — commitment-only custody (ship in Wave 2).**
Replace the Map value with `Bytes<32>` = `persistentHash<ShieldedCoinInfo>(coin)` and require the coin nonce to be derived deterministically from the invoice salt (`coin.nonce == persistentHash([pad(32,"tacitpay:nonce:"), salt])`) so the merchant can reconstruct `{nonce, color, value}` without the payer telling them. At `withdraw`, the merchant passes the `QualifiedShieldedCoinInfo` as a witness (`escrowCoin(invoiceId)`), the circuit asserts its hash matches the stored one, then `sendShielded`s it. The Merkle index (`mtIndex`) is discovered client-side from the indexer's Zswap events / chain state.

> **VERIFY (before Wave 2, not Wave 1):** (a) that a circuit parameter of type `ShieldedCoinInfo` can be constrained on `nonce` without `disclose` and that the DApp can choose the nonce when constructing the output; (b) how to obtain `mtIndex` for a contract-owned coin from Midnight.js / indexer (look at `coinCommitment`, `hasCoinCommitment`, `ZswapChainState` in https://docs.midnight.network/api-reference/ledger and the Zswap concept page https://docs.midnight.network/concepts/zswap). Use `/midnight-verify:verify` and a local-devnet spike. If (b) is not achievable in ≤ 2 days, keep Variant A and instead minimise the exposure window with an "auto-sweep" button in the dashboard; record the decision.

### 6.6 Exported circuits (Wave 1)

Reference implementation. It mirrors syntax from the official examples; expect to adjust details after the first compile and after `/midnight-verify`.

```compact
constructor(token: Bytes<32>) {
  // default<Bytes<32>> is the native token (NIGHT) colour; a custom/stablecoin colour is 32 bytes.
  paymentToken = disclose(token);
}

export circuit createInvoice(
  invoiceId: Bytes<32>,
  amount: Uint<64>,
  memoHash: Bytes<32>,
  salt: Bytes<32>,
  expiresAt: Uint<64>
): [] {
  assert(!invoices.member(disclose(invoiceId)), "Invoice already exists");
  assert(amount > 0, "Amount must be positive");
  const sk = merchantSecret();
  const tag = tagFor(merchantPubKey(sk), invoiceId);
  const c = commitInvoice(InvoiceBody { amount: amount, memoHash: memoHash }, salt);
  invoices.insert(
    disclose(invoiceId),
    InvoiceRecord {
      ownerTag: disclose(tag),
      commitment: c,
      status: InvoiceStatus.OPEN,
      expiresAt: disclose(expiresAt),
      payerTag: default<Bytes<32>>
    }
  );
  invoiceCount.increment(1);
}

export circuit payInvoice(
  invoiceId: Bytes<32>,
  amount: Uint<64>,
  memoHash: Bytes<32>,
  salt: Bytes<32>,
  coin: ShieldedCoinInfo
): [] {
  const id = disclose(invoiceId);
  assert(invoices.member(id), "Unknown invoice");
  const inv = invoices.lookup(id);
  assert(inv.status == InvoiceStatus.OPEN, "Invoice is not open");
  if (inv.expiresAt != 0) {
    assert(blockTimeLt(inv.expiresAt), "Invoice expired");
  }
  assert(commitInvoice(InvoiceBody { amount: amount, memoHash: memoHash }, salt) == inv.commitment,
         "Invoice details do not match");
  assert(coin.color == paymentToken, "Wrong token");
  assert(coin.value == amount as Uint<128>, "Wrong amount");

  receiveShielded(disclose(coin));
  escrow.insertCoin(id, disclose(coin), right<ZswapCoinPublicKey, ContractAddress>(kernel.self()));

  const psk = payerSecret();
  const ptag = tagFor(payerPubKey(psk), invoiceId);
  invoices.insert(id, InvoiceRecord {
    ownerTag: inv.ownerTag,
    commitment: inv.commitment,
    status: InvoiceStatus.PAID,
    expiresAt: inv.expiresAt,
    payerTag: disclose(ptag)
  });
  paidCount.increment(1);
}

export circuit withdraw(invoiceId: Bytes<32>): [] {
  const id = disclose(invoiceId);
  assert(invoices.member(id), "Unknown invoice");
  const inv = invoices.lookup(id);
  assert(inv.status == InvoiceStatus.PAID, "Nothing to withdraw");
  const sk = merchantSecret();
  assert(tagFor(merchantPubKey(sk), invoiceId) == inv.ownerTag, "Not the invoice owner");

  const coin = escrow.lookup(id);
  sendShielded(coin, left<ZswapCoinPublicKey, ContractAddress>(ownPublicKey()), coin.value);
  escrow.remove(id);

  invoices.insert(id, InvoiceRecord {
    ownerTag: inv.ownerTag, commitment: inv.commitment,
    status: InvoiceStatus.WITHDRAWN, expiresAt: inv.expiresAt, payerTag: inv.payerTag
  });
}

export circuit cancelInvoice(invoiceId: Bytes<32>): [] {
  const id = disclose(invoiceId);
  assert(invoices.member(id), "Unknown invoice");
  const inv = invoices.lookup(id);
  assert(inv.status == InvoiceStatus.OPEN, "Only open invoices can be cancelled");
  const sk = merchantSecret();
  assert(tagFor(merchantPubKey(sk), invoiceId) == inv.ownerTag, "Not the invoice owner");
  invoices.insert(id, InvoiceRecord {
    ownerTag: inv.ownerTag, commitment: inv.commitment,
    status: InvoiceStatus.CANCELLED, expiresAt: inv.expiresAt, payerTag: inv.payerTag
  });
}
```

> **VERIFY (Day 1–2, blocking):**
> 1. `persistentCommit<InvoiceBody>(body, salt)` compiles with a struct type argument (fallback: commit over `Vector<2, Bytes<32>>` of `[amount as Bytes<32>, memoHash]`, the pattern used in the reserve-auction example).
> 2. Whether `invoices.lookup(id)` on a `Map<Bytes<32>, InvoiceRecord>` returns a struct you can read fields from in-circuit, and whether `Map.insert` on an existing key overwrites (the auction example relies on overwrite).
> 3. Exact `disclose()` requirements the compiler imposes on `receiveShielded`/`insertCoin`/`sendShielded` arguments (the token-transfer example wraps them in `disclose`).
> 4. That `ownPublicKey()` inside `withdraw` yields the merchant's Zswap key and that a coin sent there shows up in the merchant's Lace wallet on Preview (end-to-end smoke test on local devnet first).
> 5. `blockTimeLt` signature and unit (seconds since epoch per the kernel docs).
> 6. Whether the struct literal syntax is `InvoiceRecord { field: value }` (as in the examples) in compiler 0.31.

### 6.7 Wave 2 circuit additions

```compact
// Payer proves they are the one who paid invoiceId (receipt proof). Emits nothing new on-chain
// except an attestation entry so third parties can verify by invoice + attestation id.
export ledger receiptAttestations: Map<Bytes<32>, Bytes<32>>; // attestationId -> invoiceId

export circuit proveReceipt(invoiceId: Bytes<32>, attestationId: Bytes<32>): [] {
  const id = disclose(invoiceId);
  const inv = invoices.lookup(id);
  assert(inv.status == InvoiceStatus.PAID || inv.status == InvoiceStatus.WITHDRAWN, "Not paid");
  const psk = payerSecret();
  assert(tagFor(payerPubKey(psk), invoiceId) == inv.payerTag, "Not the payer");
  receiptAttestations.insert(disclose(attestationId), id);
}
```

Also in Wave 2: **claim-based refunds** (§15.6 — `offerRefund` by the merchant, `claimRefund` by the payer; needs no payer Zswap key at all, mirroring the withdraw pattern's rationale), the **milestone escrow gate** (§15.5 — `approveRelease` plus a timeout check in `withdraw`), and Variant B escrow (§6.5). Recurring invoices (§15.7) need no new circuits.

### 6.8 Wave 3 circuit additions — selective-disclosure audit proofs

```compact
export struct AuditClaim { ownerTagAnchor: Bytes<32>; threshold: Uint<64>; fromTime: Uint<64>; toTime: Uint<64>; }
export ledger audits: Map<Bytes<32>, AuditClaim>;  // auditId -> claim

// Merchant proves the sum of N of their PAID/WITHDRAWN invoices is >= threshold,
// without revealing amounts or which invoices. N is a compile-time constant (start with 8).
witness auditInvoiceIds(): Vector<8, Bytes<32>>;
witness auditBodies(): Vector<8, InvoiceBody>;
witness auditSalts(): Vector<8, Bytes<32>>;
witness auditMask(): Vector<8, Boolean>;   // true for used slots

export circuit proveRevenueAtLeast(auditId: Bytes<32>, threshold: Uint<64>, anchor: Bytes<32>): [] {
  const sk = merchantSecret();
  const mpk = merchantPubKey(sk);
  assert(persistentHash<Vector<2, Bytes<32>>>([pad(32, "tacitpay:audit:"), mpk]) == anchor, "Bad anchor");
  const ids = auditInvoiceIds();
  const bodies = auditBodies();
  const salts = auditSalts();
  const mask = auditMask();
  // sum over bounded loop; for i in 0..8: if mask[i] { check ownership, commitment, status; sum += amount }
  // assert(sum >= threshold)
  audits.insert(disclose(auditId), AuditClaim { ownerTagAnchor: disclose(anchor), threshold: disclose(threshold), fromTime: 0, toTime: 0 });
}
```

> **VERIFY (Wave 3):** Compact's bounded loop syntax (`for (const i of 0..8)` or `map`/`fold` over `Vector`) in language 0.23 — see the reference pages at https://docs.midnight.network/category/reference — and the proof-size/time impact of N=8 vs N=16 on the local proof server (QA criterion: proof generation within acceptable time).

The `anchor` is a per-merchant audit identifier the merchant chooses to reveal to *this* auditor; it does not link to invoices (different domain separator from `ownerTag`).

**Wave 3 also adds `proveReceivablesAtLeast`** (§16.4): the same bounded-vector machinery with the status check flipped to `OPEN` (and not expired), proving "I am *owed* at least X" — a receivables-financing primitive. `AuditClaim` gains `kind: Uint<8>` (`0` = revenue, `1` = receivables).

---

## 7. Off-chain data model

### 7.1 Merchant private state (`tacitpay-merchant` private-state id)

```ts
export type MerchantPrivateState = {
  readonly secretKey: Uint8Array;               // 32 bytes, generated once, never exported unencrypted
  readonly invoices: Record<HexInvoiceId, {
    amount: bigint;                             // smallest units
    memo: string;                               // plaintext, local only
    memoHash: HexBytes32;
    salt: HexBytes32;
    expiresAt: number;                          // unix seconds, 0 = never
    createdAt: number;
    status: 'OPEN' | 'PAID' | 'WITHDRAWN' | 'CANCELLED';
    txIds: { created?: string; paid?: string; withdrawn?: string; cancelled?: string };
    escrowCoin?: { nonce: HexBytes32; color: HexBytes32; value: bigint; mtIndex?: bigint }; // Variant B
  }>;
  readonly series?: Record<HexSeriesId, {          // Wave 2 (§15.7) — recurring invoices
    seed: HexBytes32;                              // derives child ids/salts; leaves the device only inside the standing link
    amount: bigint; memoTemplate: string;
    periodDays: number; startAt: number;           // unix seconds
    nextIndex: number; childIds: HexInvoiceId[];
  }>;
};
```

### 7.2 Payer private state (`tacitpay-payer` private-state id)

```ts
export type PayerPrivateState = {
  readonly secretKey: Uint8Array;
  readonly receipts: Record<HexInvoiceId, {
    contractAddress: string;
    amount: bigint; memoHash: HexBytes32; salt: HexBytes32; memo?: string;
    paidAt: number; txId: string;
  }>;
};
```

Both are stored with `levelPrivateStateProvider` (encrypted at rest; requires `accountId` and a ≥16-char password with 3 of 4 character classes — derive the password from the wallet, do not hardcode; see https://docs.midnight.network/guides/deploy-and-operate#configuring-providers-for-a-contract). In the browser, derive the password from a user-entered passphrase stretched with PBKDF2 and cache it in memory for the session.

### 7.3 Invoice link payload (URL fragment, base64url-encoded JSON)

```json
{
  "v": 1,
  "net": "preview",
  "contract": "<contract address hex>",
  "id": "<invoiceId hex>",
  "amount": "1250000",
  "token": "<colour hex or 'NIGHT'>",
  "memo": "Logo design – final",
  "salt": "<salt hex>",
  "exp": 1727000000
}
```

Rules: the fragment is never sent to a server; the UI must refuse payloads whose `net` or `contract` do not match the app configuration; `memoHash` is recomputed from `memo` on the payer side and must match the commitment.

Series standing links (Wave 2, §15.7) use `"v": 2, "kind": "series"` and carry `{seed, amount, memoTemplate, periodDays, startAt}` in place of the per-invoice fields; the payer's client derives the current period's `invoiceId`/`salt` locally from the seed.

### 7.4 Identifiers and encodings

- `invoiceId`, `salt`, `secretKey`: `crypto.getRandomValues(new Uint8Array(32))`.
- Hex everywhere in TS (`@midnight-ntwrk/midnight-js-utils` has `toHex`/`fromHex`).
- `memoHash`: SHA-256 via WebCrypto (`crypto.subtle.digest`).
- Amounts: `bigint` in smallest units; UI formats with token decimals (NIGHT: 6 → 1 NIGHT = 10^6 STAR per https://docs.midnight.network/tokens/overview ; USDM: confirm decimals from the issuer docs in Wave 3).

---

## 8. TypeScript API package (`packages/api`)

A framework-agnostic library that wraps the generated contract module and Midnight.js. Both the UI and the CLI/MCP use it, so there is exactly one place where circuit calls happen.

### 8.1 Public interface

```ts
export interface TacitPayApi {
  readonly contractAddress: string;
  readonly role: 'merchant' | 'payer' | 'observer';

  // Merchant
  createInvoice(input: { amount: bigint; memo: string; expiresAt?: number }): Promise<{ invoiceId: string; link: string; txId: string }>;
  withdraw(invoiceId: string): Promise<{ txId: string }>;
  cancelInvoice(invoiceId: string): Promise<{ txId: string }>;
  listMyInvoices(): Promise<InvoiceView[]>;                 // private state joined with on-chain status

  // Payer
  decodeLink(link: string): InvoiceLinkPayload;             // pure; validates net/contract
  payInvoice(payload: InvoiceLinkPayload): Promise<{ txId: string }>;
  listMyReceipts(): Promise<ReceiptView[]>;

  // Anyone
  getInvoiceStatus(invoiceId: string): Promise<{ status: InvoiceStatus; expiresAt: number; exists: boolean }>;
  watchInvoice(invoiceId: string): Observable<InvoiceStatus>; // via publicDataProvider.contractStateObservable

  // Wave 2
  proveReceipt?(invoiceId: string): Promise<{ attestationId: string; txId: string }>;
  approveRelease?(invoiceId: string): Promise<{ txId: string }>;                   // payer unlocks milestone escrow (§15.5)
  offerRefund?(invoiceId: string): Promise<{ txId: string }>;                      // merchant offers refund (§15.6)
  claimRefund?(invoiceId: string): Promise<{ txId: string }>;                      // payer claims offered refund (§15.6)
  createSeries?(input: { amount: bigint; memoTemplate: string; periodDays: number; startAt?: number }): Promise<{ seriesId: string; link: string; firstInvoiceId: string }>; // §15.7
  mintNextInSeries?(seriesId: string): Promise<{ invoiceId: string; txId: string }>; // §15.7
  // Wave 3
  proveRevenueAtLeast?(input: { invoiceIds: string[]; threshold: bigint; auditId?: string }): Promise<{ auditId: string; anchor: string; txId: string }>;
  proveReceivablesAtLeast?(input: { invoiceIds: string[]; threshold: bigint; auditId?: string }): Promise<{ auditId: string; anchor: string; txId: string }>; // §16.4
}
```

### 8.2 Construction

```ts
export async function createTacitPayApi(opts: {
  providers: TacitPayProviders;          // MidnightProviders<CircuitIds, 'tacitpay-merchant' | 'tacitpay-payer', ...>
  contractAddress?: string;              // omit to deploy (CLI/tests only)
  role: 'merchant' | 'payer' | 'observer';
  paymentToken: Uint8Array;              // 32-byte colour; NIGHT = all zeros (default<Bytes<32>>)
}): Promise<TacitPayApi>;
```

- Uses `CompiledContract.make('tacitpay', Contract)` + `withWitnesses` + `withCompiledFileAssets` (Node) or a fetch-based ZK config provider (browser), then `deployContract` / `findDeployedContract` from `@midnight-ntwrk/midnight-js-contracts`. Follow the exact sequence in https://docs.midnight.network/guides/deploy-and-operate#deploying-a-contract .
- Reads public state with `providers.publicDataProvider.queryContractState(address)` and decodes with the generated `ledger(state.data)` function (pass `.data`, not the whole `ContractState`).
- Providers type alias (keep in `packages/api/src/types.ts`):
  ```ts
  export type CircuitIds = 'createInvoice' | 'payInvoice' | 'withdraw' | 'cancelInvoice' /* | Wave2/3 */;
  export type TacitPayProviders = MidnightProviders<CircuitIds, 'tacitpay-merchant' | 'tacitpay-payer', MerchantPrivateState | PayerPrivateState>;
  ```

### 8.3 Provider wiring

**Node (CLI, tests, MCP server)** — copy the six-provider wiring from https://docs.midnight.network/guides/deploy-and-operate#configuring-providers-for-a-contract :
`levelPrivateStateProvider` (with `accountId`), `indexerPublicDataProvider(httpUrl, wsUrl)`, `NodeZkConfigProvider<CircuitIds>(managedDir)`, `httpClientProofProvider('http://127.0.0.1:6300', zkConfigProvider)`, and a `WalletFacade`-backed class implementing both `WalletProvider` and `MidnightProvider` (`balanceTx` → `wallet.balanceUnboundTransaction` + `finalizeRecipe`; `submitTx` → `wallet.submitTransaction`). Import ledger types from `@midnight-ntwrk/midnight-js-protocol/ledger`, never from the ledger package directly (type-clash footgun documented in the guide). Call `setNetworkId(...)` before creating any provider and polyfill `WebSocket` in Node.

**Browser (UI)** — same six slots with:
- `FetchZkConfigProvider` (`@midnight-ntwrk/midnight-js-fetch-zk-config-provider`) pointed at the served `managed/tacitpay` artifacts (`keys/`, `zkir/`) copied into `packages/ui/public/managed/tacitpay/`.
- `indexerPublicDataProvider(http, ws, WebSocket)` — pass the native `WebSocket` as third argument for browser subscriptions (per the provider table in the deploy guide).
- Proof provider — **three-tier, feature-detected, in this order** (D-010). Proving requires the private witness, so whoever proves sees the invoice secrets; the tier order is therefore a trust order, not a convenience order:
  1. **Wallet-provided proving** — `dappConnectorProvingProvider` / `dappConnectorProofProvider` (`@midnight-ntwrk/midnight-js-dapp-connector-proof-provider`) when `typeof api.getProvingProvider === 'function'`. 1AM implements it and proves **in-browser via WASM** (Halo2 over BLS12-381, a few MB, no separate process) — this is the zero-install, zero-trust path and the one judges should be pointed at first. Never hardcode the deprecated `Configuration.proverServerUri`.
  2. **Local proof server** — `httpClientProofProvider('http://localhost:6300', zkConfigProvider)`. Required for Lace as documented; witness data stays on the user's machine.
  3. **User-supplied prover URL** — a remote proof server **the user controls**, over TLS (explicitly permitted by https://docs.midnight.network/guides/run-proof-server). Settings-only, never a default, and never a TacitPay-operated endpoint: a prover we ran would see every amount and party, reintroducing exactly the trusted intermediary this product removes (§1.1).
  Surface the active tier in the UI as "Proving: in wallet / local server / your server (<host>)" with a health indicator for tiers 2–3.

> **VERIFY (Day 3, blocking for the wallet matrix):** whether the currently shipping Lace build implements `getProvingProvider()`. Docs (community-wallets pages, accurate as of June 2026) say it does not; input-output-hk/lace issue #2224 was **closed as completed on 2026-08-07** with the maintainer stating the fix ships in the next release. Test against the installed extension and record the answer in D-010 — it decides whether Lace users still need Docker.
- Wallet + Midnight provider: built on the DApp Connector `ConnectedAPI` obtained from `Object.values(window.midnight)[i].connect(networkId)` (§9.2). Never hardcode `window.midnight.mnLace`; wallets inject under a UUID key (React guide troubleshooting).

> **VERIFY (Day 3):** the precise `ConnectedAPI` methods on DApp Connector API 4.0.1 used to balance/prove/submit a transaction from a DApp, and the reference implementation in the official bulletin-board DApp: https://github.com/midnightntwrk/example-bboard (its `ui` package wires browser providers). Mirror it; do not invent.

### 8.4 Error handling

Map Midnight errors to user-facing messages: `Wallet.InsufficientFunds` → "Your wallet has NIGHT but no DUST yet; register for DUST and wait for a spendable coin" (link to https://docs.midnight.network/guides/acquire-tokens); circuit assertion messages (`Invoice is not open`, `Wrong amount`, …) are shown verbatim; proof-server connection errors point to §12.4. Use the official error references: https://docs.midnight.network/api-reference/error-reference/dapp-connector-errors , https://docs.midnight.network/api-reference/error-reference/proof-server-errors , https://docs.midnight.network/api-reference/error-reference/ledger-errors , https://docs.midnight.network/api-reference/error-reference/indexer-errors .

---

## 9. Frontend (`packages/ui`) — Vite + React 18 + TypeScript + Tailwind

Read `/mnt/skills/public/frontend-design/SKILL.md` (if present in your environment) before styling. Design goal: a calm, fintech-grade UI — not a crypto dashboard. Single accent colour, generous whitespace, monospace only for hashes/addresses. Mobile-responsive (judges open links on phones).

### 9.1 Routes

| Route | Who | Purpose |
|---|---|---|
| `/` | all | Landing: one-paragraph pitch, "I'm a merchant" / "I have an invoice link" / "Verify an invoice". Network badge (Preview/Local). |
| `/merchant` | merchant | Dashboard: connect wallet, unlock private state, invoice table (status chips, amount, memo, created, expires, actions), "New invoice" modal, withdraw/cancel buttons, copy-link/QR. Wave 2: series (recurring) management with "mint next period", offer-refund action, milestone release-status chips. |
| `/pay#<payload>` | payer | Decodes fragment; shows merchant-free summary (amount, memo, expiry), on-chain status check, Connect wallet → Pay. Success state shows txId, receipt saved, link to `/verify/<id>`. |
| `/receipts` | payer | Receipts from private state; each with "Verify on chain" and (Wave 2) "Prove I paid", "Approve release" (milestone invoices, §15.5) and "Claim refund" (offered refunds, §15.6). |
| `/verify/<invoiceId>` | anyone | Public status page. No wallet. Shows status, expiry, block/tx references, and an explanation of what is and isn't visible on chain. |
| `/settings` | all | Network selection (local / preprod), **proving mode** (auto / in-wallet / local server / your own server URL — §8.3 three-tier model, with health check and a plain-English note that whoever proves sees the invoice data), export/import private state (Midnight.js supports private-state export/import — see `PrivateStateExport` types in the midnight-js API reference). |

### 9.2 Wallet connection

Follow https://docs.midnight.network/guides/react-wallet-connect exactly: enumerate `window.midnight`, let the user pick if >1 wallet, `await wallet.connect(networkId)` where `networkId` ∈ `'undeployed' | 'preprod' | 'preview' | 'mainnet'`, then `getConnectionStatus()`, `getUnshieldedAddress()`; request the shielded address only on the Pay and Withdraw flows where it is needed. Render wallet `name`/`icon` safely (no `dangerouslySetInnerHTML`).

**Target both Lace and 1AM** (D-010). Both inject under friendly keys (`window.midnight.mnLace`, `window.midnight['1am']`) but the v4 spec installs each wallet under its own key with a stable `rdns` field — so discover by scanning `Object.values(window.midnight)` and matching on `rdns`/`name`, check `apiVersion` against the supported range, and **feature-detect every optional method before calling it** (`getProvingProvider`, `signData` — Lace omits both as of the June 2026 docs). Wallets that do not inject a conformant connector (Ctrl, Gero) must degrade gracefully rather than throw. Mirror the Edda Labs `midnight-starter-template` wallet widget (demo: `counter.nebula.builders`), which already wires Lace + 1AM, instead of re-deriving the logic.

### 9.3 States every screen must handle

Loading, empty, error (with the §8.4 mapping), proof-in-progress (proofs take seconds to tens of seconds — show a stepper: "Building transaction → Generating proof → Balancing fees → Submitting → Waiting for confirmation"), and success with a copyable txId and explorer link (`https://preview.midnightexplorer.com/` or `https://midnight-preview.subscan.io/`).

### 9.4 Copy rules

- Never use the word "anonymous". Use "private" and "provable".
- Every place an amount is shown privately, add a small lock icon with tooltip "Not visible on chain".
- On `/verify`, explicitly list what an observer can and cannot see (from §4.2).

---

## 10. CLI (`packages/cli`)

Node CLI used for deployment, demos and integration tests. Commands:

```
tacitpay deploy --network local|preview|mainnet --token NIGHT|USDM|<hex>   # prints contract address; writes deployments/<network>.json
tacitpay invoice create --amount 1.25 --memo "..." [--expires 2026-09-30]   # prints link
tacitpay invoice pay --link <url>
tacitpay invoice withdraw --id <hex>
tacitpay invoice cancel --id <hex>
tacitpay invoice status --id <hex>
tacitpay invoice approve-release --id <hex>   # Wave 2: payer unlocks milestone escrow (§15.5)
tacitpay invoice refund-offer --id <hex>      # Wave 2: merchant offers refund (§15.6)
tacitpay invoice refund-claim --id <hex>      # Wave 2: payer claims offered refund (§15.6)
tacitpay series create --amount 1.25 --memo "..." --period 30d   # Wave 2 (§15.7)
tacitpay series mint-next --series <hex>                          # Wave 2 (§15.7)
tacitpay demo seed                  # judge sandbox: seed local devnet with wallets + sample invoices (§14.1)
tacitpay wallet fund-local          # uses local devnet genesis wallet helpers
tacitpay wallet dust-status         # shows DUST balance/generation (see acquire-tokens guide)
```

Wallets come from `@midnight-ntwrk/wallet-sdk` (`WalletFacade`) seeded from `TACITPAY_SEED` in `.env.<network>` (gitignored). For the local devnet use the genesis seed documented in the local-dev repo. Never print seeds.

---

## 11. Testing strategy

### 11.1 Layers

| Layer | Tool | Runs where | What it proves |
|---|---|---|---|
| Compile gate | `compact compile` in the local gate (§11.5) | local | Technical gate (§2.4). |
| Unit / simulation | Vitest + generated contract module (`new Contract(witnesses)`, `impureCircuits.*`) | local, no network | Circuit logic, state machine, assertions, privacy invariants. Pattern: https://docs.midnight.network/compact/test-and-debug and https://docs.midnight.network/guides/compact-javascript-runtime |
| Integration | Vitest against `midnight-local-dev` (docker compose: node + indexer + proof server) | local (pre-submission run) | Real deploy, real proofs, real coins, `callTx`, indexer reads. |
| End-to-end (manual + recorded) | Lace on Preview | Before each submission | Demo readiness. |

### 11.2 Unit test matrix (minimum; file `contracts/src/test/tacitpay.test.ts`)

| ID | Test | Expect |
|---|---|---|
| U-01 | createInvoice stores record with status OPEN, expiresAt, commitment ≠ zero, ownerTag ≠ zero | pass |
| U-02 | createInvoice twice with same id | throws "Invoice already exists" |
| U-03 | createInvoice with amount 0 | throws "Amount must be positive" |
| U-04 | two invoices by same merchant have different ownerTags (INV-2) | tags differ |
| U-05 | payInvoice with correct preimage + correct coin | status PAID, escrow has entry, payerTag set, paidCount=1 |
| U-06 | payInvoice with wrong amount in preimage | throws "Invoice details do not match" |
| U-07 | payInvoice with correct preimage but coin.value ≠ amount | throws "Wrong amount" |
| U-08 | payInvoice with wrong token colour | throws "Wrong token" |
| U-09 | payInvoice on PAID invoice (INV-7) | throws "Invoice is not open" |
| U-10 | payInvoice after expiry (INV-8) | throws "Invoice expired" |
| U-11 | payInvoice on unknown id | throws "Unknown invoice" |
| U-12 | withdraw by owner after PAID | status WITHDRAWN, escrow entry removed, a Zswap output to ownPublicKey exists |
| U-13 | withdraw by non-owner secret (INV-6) | throws "Not the invoice owner" |
| U-14 | withdraw on OPEN invoice | throws "Nothing to withdraw" |
| U-15 | cancel by owner on OPEN | CANCELLED |
| U-16 | cancel on PAID | throws |
| U-17 | privacy: after full lifecycle, serialise ledger state; assert amount (as bytes/bigint), memo bytes, merchant secret, payer secret do not appear anywhere (INV-1, INV-3, INV-4) | pass (Variant A: allow escrow entry only while PAID) |
| U-18 | Wave 2: proveReceipt by payer succeeds; by non-payer fails | |
| U-19 | Wave 3: proveRevenueAtLeast with 3 invoices summing ≥ threshold passes; < threshold fails; invoice from another merchant fails | |
| U-20 | Wave 2: milestone — withdraw before approveRelease and before releaseAfter (INV-9) | throws "Escrow not released" |
| U-21 | Wave 2: milestone — approveRelease by payer, then withdraw | WITHDRAWN |
| U-22 | Wave 2: milestone — approveRelease by non-payer secret | throws "Not the payer" |
| U-23 | Wave 2: milestone — withdraw after releaseAfter without approval (timeout path) | WITHDRAWN |
| U-24 | Wave 2: refund — offerRefund by owner on PAID → REFUNDABLE; by non-owner throws | pass |
| U-25 | Wave 2: refund — claimRefund by payer → REFUNDED, escrow removed, coin to payer; by non-payer throws (INV-10) | pass |
| U-26 | Wave 2: refund — withdraw on REFUNDABLE throws; claimRefund on WITHDRAWN throws | pass |
| U-27 | Wave 2: series — child id/salt derivation deterministic; children share no public value (INV-11; api-layer test) | pass |
| U-28 | Wave 3: proveReceivablesAtLeast counts only OPEN, unexpired invoices; PAID/expired excluded | pass |

> **VERIFY (Day 2):** how coin-handling circuits (`receiveShielded`, `insertCoin`, `sendShielded`) are exercised in the JS runtime without a network — i.e. what the `CircuitContext`/Zswap local state must contain (see `createCircuitContext`, `emptyZswapLocalState`, `createZswapInput/Output` in https://docs.midnight.network/api-reference/compact-runtime and the "Use Compact contracts from JavaScript" guide). If coin circuits cannot be unit-tested offline, cover U-05/U-07/U-08/U-12 in the integration layer and say so in the README test section.

### 11.3 Integration tests (`packages/api/test/*.int.test.ts`)

- `yarn env:up` (docker compose from `midnight-local-dev`), deploy, run the full lifecycle with two wallets (merchant, payer) from pre-funded genesis seeds; assert indexer state after each step with `queryContractState` + `ledger(state.data)`; assert merchant wallet balance increased after withdraw. Use `@midnight-ntwrk/testkit-js` (`LocalTestEnvironment`, `WalletFactory`) if it simplifies wallet setup. Timeouts ≥ 10 minutes (proofs).
- Local-devnet caveat from the docs: DUST generates in ~5 minutes locally; the indexer may exit on first start of a fresh chain (see local-network troubleshooting in https://docs.midnight.network/guides/networks-and-environments).

### 11.4 Privacy tests (INV-1…INV-8)

Implement as unit tests where possible (U-04, U-05, U-09, U-10, U-13, U-17) and as one integration test that dumps the public contract state via the indexer after a full lifecycle and greps for forbidden values. Document the result in README under "Privacy verification".

### 11.5 Verification gate (local — no CI by owner decision)

There is deliberately no CI in this repo (docs/DECISIONS.md D-008). The equivalent gate runs locally before every push and before every submission, on a clean checkout: `yarn compile && yarn lint && yarn typecheck && yarn test` (plus `yarn test:int` when the local devnet is up). The README's test-inventory section reports the latest results.

---

## 12. Environments, configuration, funding

### 12.1 Versions observed 2026-08-22 (re-check the matrix each wave)

| Component | Version | Source |
|---|---|---|
| Compact language / compiler | 0.23 / 0.31.x | https://docs.midnight.network/compact/data-types/ledger-adt (header) |
| Ledger | 8.0.x (`@midnight/ledger` 8.0.3) | https://docs.midnight.network/relnotes/overview |
| Midnight.js | **4.1.1** (was written 4.0.4 — that version never existed; see below) | https://docs.midnight.network/relnotes/support-matrix |
| compact-runtime | 0.16.0 | https://docs.midnight.network/api-reference/compact-runtime |
| onchain-runtime | 3.1.0 (floated by compact-runtime; **do not pin**) | https://docs.midnight.network/api-reference/onchain-runtime |
| Wallet SDK | **`@midnightntwrk/wallet-sdk` 1.2.0** — note the scope has **no hyphen** | https://docs.midnight.network/relnotes/support-matrix |
| DApp Connector API | 4.0.1 | https://docs.midnight.network/api-reference/dapp-connector |
| Indexer API | v4 (`/api/v4/graphql`) | https://docs.midnight.network/api-reference/midnight-indexer |
| Proof server image | `midnightntwrk/proof-server:8.1.0` | https://docs.midnight.network/getting-started/installation |
| Devnet images | node `1.0.0` · indexer-standalone `4.3.3` | midnightntwrk/midnight-local-dev `standalone.yml` |
| testkit-js | 4.1.1 | https://docs.midnight.network/api-reference/testkit-js |
| Node.js | 22+ ; package manager: yarn (matches official examples) | https://docs.midnight.network/getting-started/hello-world |

Compatibility matrix (authoritative): https://docs.midnight.network/relnotes/support-matrix

> **Corrected 2026-08-24 (rule 0.10 — the registry wins over this document; recorded as D-011).** Verified against npm, not memory:
>
> - **Midnight.js 4.0.x does not exist for every package.** `@midnight-ntwrk/midnight-js-protocol` publishes `4.1.0` upward; there is no `4.0.4`. Pin the whole Midnight.js set at **4.1.1**.
> - **4.0.x would not have worked anyway**: `midnight-js-contracts@4.0.4` targets compact-runtime **0.15.0**, while the generated TacitPay contract requires **0.16.0**.
> - **Two wallet-sdk scopes exist and have diverged.** `@midnightntwrk/wallet-sdk` (no hyphen) is at **1.2.0** and is the maintained one the support matrix names; `@midnight-ntwrk/wallet-sdk` (hyphenated, the scope every other Midnight package uses) is stuck at 1.1.0. Use the **no-hyphen** scope for the wallet SDK only — everything else keeps the hyphen. This is a genuine footgun; expect to trip over it again.
> - Import surfaces that differ from earlier assumptions: `CompiledContract` comes from `@midnight-ntwrk/midnight-js-protocol/compact-js`; `deployContract`/`findDeployedContract` from `midnight-js-contracts`; ledger types **only** via `midnight-js-protocol/ledger` (wallet ledger ranges lock-aligned to `ledger-v8@8.1.0` to avoid nominal type clashes).

### 12.2 Endpoints (from https://docs.midnight.network/relnotes/network)

| Env | Node RPC | Indexer GraphQL | Faucet | Explorer |
|---|---|---|---|---|
| Local (`undeployed`) | from `midnight-local-dev` compose (node ws `:9944`, indexer `http://127.0.0.1:8088/api/v4/graphql`, proof `:6300`) | | genesis wallets | — |
| **Preview** (primary public target — testnet USDM is bridged here) | https://rpc.preview.midnight.network | https://indexer.preview.midnight.network/api/v4/graphql | https://midnight-tmnight-preview.nethermind.dev/ | https://preview.midnightexplorer.com/ |
| Preprod (secondary; no tUSDM) | https://rpc.preprod.midnight.network | https://indexer.preprod.midnight.network/api/v4/graphql | https://midnight-tmnight-preprod.nethermind.dev/ | https://preprod.midnightexplorer.com/ , https://midnight-preprod.subscan.io/ |
| Mainnet (Wave 3 stretch) | https://rpc.mainnet.midnight.network | https://indexer.mainnet.midnight.network/api/v4/graphql | — (real NIGHT) | https://midnightexplorer.com/ |

WebSocket indexer URL for local is `ws://127.0.0.1:8088/api/v4/graphql/ws` (deploy guide). For Preprod/Preview use the same `wss://…/api/v4/graphql/ws` pattern — **VERIFY** against https://docs.midnight.network/guides/networks-and-environments#environment-reference before hardcoding.

### 12.3 Configuration files

- `config/networks.json` — the table above, keyed by network id.
- `packages/ui/.env` — `VITE_NETWORK_ID` (default `preview`), `VITE_CONTRACT_ADDRESS`, `VITE_INDEXER_URL`, `VITE_INDEXER_WS_URL`, `VITE_PROOF_SERVER_URL` (default `http://localhost:6300`), `VITE_PAYMENT_TOKEN` (`NIGHT`, `USDM`, or hex colour).
- `.env.local` / `.env.preview` — `TACITPAY_SEED` (gitignored; `.env.example` committed).
- `deployments/<network>.json` — `{ contractAddress, deployedAt, compilerVersion, paymentToken, txId }` (committed; judges need the address).

### 12.4 Funding and DUST (do this on Day 1 — it has a long lead time)

Per https://docs.midnight.network/guides/acquire-tokens and https://docs.midnight.network/tokens/overview :
- Every transaction needs DUST; DUST is generated by NIGHT you hold and register. On public networks the cross-chain registration path can take **~12 hours**; locally ~5 minutes.
- Preview: create two Lace wallets (merchant, payer), set Midnight network to Preview in Lace (Settings → Network), request tNIGHT from the Preview faucet for both, register for DUST generation in Lace, and enable shielded mode (Lace is unshielded by default; shielded is opt-in) so the payer holds **shielded** tNIGHT to pay with. Keep a third seed-based wallet for the CLI.
- Lace must be set to the local proof server (Settings » Midnight » Local `http://localhost:6300`).
- **tUSDM on Preview** (Day 4 spike, then Wave 2): create a Cardano Preprod wallet (Lace's Cardano side on Preprod works), get tADA from the Cardano testnet faucet and tUSDM from https://tusdm.moneta.global , then bridge to your Midnight Preview unshielded address with `npm install @via-labs-tech/usdm-bridge` → `node bridge.mjs c2m 5 mn_addr_preview1...` (guide: https://developer.vialabs.tech/docs/examples/guides/usdm-cardano-midnight ; UI alternative with built-in faucets: https://midnight.anytoany.xyz ). USDM arrives **unshielded**; see §16.2 for the shielding spike.
- Mainnet (Wave 3): real NIGHT required; budget it or stay on Preview with tUSDM (§16.2).

### 12.5 Local devnet

`git clone https://github.com/midnightntwrk/midnight-local-dev` next to this repo (or set `MIDNIGHT_LOCAL_DEV` to an existing checkout), then `yarn env:up` / `env:status` / `env:down` — wrappers over `scripts/devnet.sh`, which drives the devnet's `standalone.yml` and waits on its healthchecks. Keep local as the default loop; go to Preview only for e2e and demo.

Verified 2026-08-24 against the cloned repo:

- Three containers on **fixed** ports — node `9944`, indexer `8088` (`/api/v4/graphql`, ws at `/api/v4/graphql/ws`), proof server `6300`. Not configurable: these are the defaults Lace hardcodes for its **Undeployed** network, so Lace connects with no custom endpoint setup. They match `config/networks.json` → `undeployed` exactly.
- Images: `midnightntwrk/midnight-node:1.0.0`, `midnightntwrk/indexer-standalone:4.3.3`, `midnightntwrk/proof-server:8.1.0`.
- **Name-collision gotcha:** the compose project names its proof-server container `midnight-proof-server`. If one is already running that compose did not create (common — the same image is used standalone for Preview work), `docker compose up` fails. `scripts/devnet.sh` detects this and prints the exact `docker rm -f` fix instead of failing cryptically. The devnet's own `npm run clean` force-removes all three for the same reason.
- Funding: `cd midnight-local-dev && npm install && npm start` gives an interactive menu. Option 1 (accounts JSON of BIP39 mnemonics) transfers 50,000 NIGHT **and registers DUST**, leaving accounts ready to submit transactions; option 2 (Bech32 addresses) sends NIGHT only, and the recipient must register DUST themselves. Genesis master seed is `0x00…001`. Up to 10 accounts per operation.

---

## 13. Repository layout, tooling, conventions

```
tacitpay/
├── LICENSE                      Apache-2.0 (day 1)
├── README.md                    (§17.1 template)
├── PRD.md                       this document
├── docs/
│   ├── WAVE-CHANGELOG.md        what shipped per wave (judges read this)
│   ├── DECISIONS.md             ADR-style log incl. every VERIFY outcome
│   ├── PRIVACY.md               §4 expanded
│   ├── ARCHITECTURE.md          §5 + diagrams (Mermaid)
│   └── DEMO-SCRIPT.md           video script (§17.3)
├── contracts/
│   ├── tacitpay.compact
│   ├── managed/tacitpay/        compiler output (commit `contract/` and `compiler/`; keys/zkir per .gitattributes — see note)
│   ├── src/witnesses.ts
│   └── src/test/*.test.ts       unit/simulation tests
├── packages/
│   ├── api/                     §8
│   ├── ui/                      §9 (Vite React)
│   ├── cli/                     §10
│   ├── sdk/                     Wave 2 (@tacitpay/node)
│   └── mcp/                     Wave 2 (MCP server)
├── deployments/                 contract addresses per network
├── config/networks.json
├── assets/                      logo (light/dark SVG) used by the README
└── package.json                 yarn workspaces; scripts: compile, build, test, test:int, env:up, env:down, lint, typecheck
```

Notes:
- Generated `keys/` and `zkir/` can be large; commit them if the repo stays < 100 MB (judges must be able to run without compiling), otherwise add a `yarn compile` step to the README and commit only `contract/` + `compiler/`. Decide on Day 2 after the first compile and record it.
- GitHub repo settings: add topics `midnightntwrk`, `midnight`, `compact`, `zero-knowledge`, `privacy`, `payments`, `stablecoin`, `usdm`. Add the Midnight attribution line in the README footer ("Built on Midnight — https://midnight.network").
- Conventional commits; small commits; the commit history is explicitly judged ("Version Control Use").
- Lint: ESLint + Prettier; TS `strict: true`.

---

## 14. Wave plan and acceptance criteria

### 14.1 Wave 1 (Aug 27 – Sep 16) — "The loop works"

**Scope (must ship):**
1. `tacitpay.compact` with `createInvoice`, `payInvoice`, `withdraw`, `cancelInvoice`; Variant A escrow; compiles via the §11.5 local gate.
2. Unit tests U-01…U-17 (coin tests may move to integration per the Day-2 VERIFY).
3. Integration test on local devnet: full lifecycle with two wallets.
4. `packages/api` with the Wave 1 interface.
5. `packages/cli`: deploy + lifecycle commands.
6. `packages/ui`: `/`, `/merchant`, `/pay`, `/receipts`, `/verify/:id`, `/settings`; Lace connection; works on Preview.
7. Deployed contract on **Preview**, address in `deployments/preview.json` and README. ✅ _Done 2026-08-26 — `1f37835dd1…21bc547`._
8. README (§17.1), `docs/PRIVACY.md`, `docs/ARCHITECTURE.md`, deck (§17.2), 3–5 minute video (§17.3), `docs/WAVE-CHANGELOG.md` "Wave 1" section.
9. Repo topics + Apache-2.0.
10. **Judge sandbox** (`yarn demo:seed` / `tacitpay demo seed`): scripted local-devnet seeding — two funded wallets and three sample invoices in known states — so judge path (b) completes in minutes; referenced from README item 6 (§17.1).

**Acceptance criteria:**
- A judge can clone, `yarn install`, `yarn compile`, `yarn test` and see all unit tests pass in < 5 minutes without Docker.
- A judge with Lace on Preview can open the hosted UI (Vercel/Netlify static), create an invoice, open the link in a second browser profile, pay, and withdraw — following README steps only.
- `/verify/<id>` shows PAID for the demo invoice and the contract state on the explorer contains no plaintext amount after withdrawal.

**Day-by-day (21 days; adjust, but keep the order of the first week):**

| Day | Work |
|---|---|
| 0 (Aug 26) | Kickoff workshop. Install Compact, proof server, Midnight Expert; `doctor` green. Clone `example-hello-world`, run `yarn test:local`. Fund Preview wallets (§12.4) — start DUST registration now. Also create a Cardano Preprod wallet and request tADA + tUSDM (needed for the Day-4 bridge spike). |
| 1 | Repo skeleton (§13), LICENSE, local compile gate (§11.5). Write `tacitpay.compact` **without** coin handling (create/cancel + status) → compile → U-01…U-04, U-11, U-15, U-16. |
| 2 | Add `payInvoice`/`withdraw` with `receiveShielded`/`insertCoin`/`sendShielded`. Resolve all Day-1/2 VERIFY items. Compile. Spike coin flow on local devnet with the CLI (integration test skeleton). **Go/no-go on Variant A by end of day 3.** |
| 3 | Integration test passes locally (create → pay → withdraw, balances checked). Resolve Day-3 VERIFY (browser providers from example-bboard). |
| 4 | **tUSDM spike (Completed ahead of schedule on 2026-08-22):** Bridged 5 tUSDM to Preview wallet (`0c0de55f...`), confirmed token color `003bacd9...`, verified 6-decimal micro-unit balance, and established dual-path architecture in §16.2. |
| 4–5 | `packages/api` complete; unit tests U-05…U-14, U-17; privacy test. |
| 6–7 | UI: wallet connect, merchant dashboard, create invoice, link + QR. |
| 8–9 | UI: pay page, receipts, verify page, settings; proof stepper; error mapping. |
| 10 | Deploy to Preview; e2e with Lace; fix. Commit `deployments/preview.json`. ✅ _2026-08-26: deployed; Lace create-leg e2e proven; pay leg pending shielded payer funding._ |
| 11–12 | Polish UI (frontend-design skill), empty/error states, mobile. Host static UI. Build the judge-sandbox seeding script (`demo seed`). |
| 13 | README, PRIVACY.md, ARCHITECTURE.md, WAVE-CHANGELOG.md. |
| 14 | Deck + record video (one clean take; re-record if any step fails). |
| 15 | Buffer / judge-walkthrough test on a clean machine. Submit ≥ 12 h before the platform deadline. |
| 16–20 | Post-submission: start Wave 2 VERIFY spikes (Variant B, MCP), answer comments on AKINDO. |

### 14.2 Wave 2 (Sep 27 – Oct 17) — "Developers and agents"

**Scope:**
1. **Variant B escrow** (no plaintext amounts in public state at any time) — or documented fallback (§6.5).
2. `proveReceipt` circuit + "Prove I paid" UI + public attestation verifier page.
3. `packages/sdk` → npm `@tacitpay/node`: `createInvoice`, `getStatus`, `watch`, `verifyAttestation`, webhook-style callback on status change (polling the indexer subscription).
4. `packages/mcp` → npm `@tacitpay/mcp`: MCP server (stdio) exposing tools `create_invoice`, `get_invoice_status`, `list_invoices`, `withdraw_invoice`; demo from Claude Code in the video. Read `/mnt/skills/examples/mcp-builder/SKILL.md` if available; otherwise follow https://modelcontextprotocol.io/docs .
5. Hosted checkout page improvements: QR code, countdown to expiry, auto-refresh on payment (indexer subscription), printable receipt.
6. **DUST sponsorship** (merchant pays the payer's fee) if the guide's contract rule fits — https://docs.midnight.network/guides/dust-sponsorship . This is a strong "Midnight-native" feature for UX score.
7. **tUSDM payments on Preview**: deploy a second contract instance with `paymentToken = <USDM colour>` (or make the token selectable per invoice if the spike shows both forms are usable), UI token selector, 6-decimal formatting, and a bridged-tUSDM funding guide in the README.
8. **Milestone escrow** (§15.5): `approveRelease` circuit, `withdraw` gate + timeout, dashboard/receipts UI.
9. **Claim-based refunds** (§15.6): `offerRefund`/`claimRefund` circuits + UI on both sides.
10. **Recurring invoices** (§15.7): series creation, standing links, "mint next period" flow — no new circuits.
11. Wave 2 tests U-18, U-20…U-27 + SDK/MCP tests; CHANGELOG with before/after privacy table.

**Acceptance:** from a fresh Claude Code session with `@tacitpay/mcp` configured, "create an invoice for 25 NIGHT for 'consulting'" yields a link that a Lace user pays; the merchant dashboard updates live; the payer produces a receipt attestation a third party verifies on `/attest/<id>`. Additionally: a milestone invoice is paid, release-approved and withdrawn; an offered refund is claimed back by the payer; and a second period of a retainer series is minted and paid from the same standing link.

### 14.3 Wave 3 (Oct 27 – Nov 16) — "Prove it to the auditor; real stablecoin"

**Scope:**
1. `proveRevenueAtLeast` (§6.8) + "Audit proofs" dashboard tab + `/audit/<auditId>` verifier page showing the claim and its on-chain proof tx.
2. **USDM on mainnet** (§16.2): deploy with `paymentToken = <mainnet USDM colour>` and make one real payment if funding allows; otherwise the Wave 2 Preview tUSDM flow remains the demo, with an explicit note.
3. Mobile: Kuira SDK (Android) proof-of-concept pay screen — https://github.com/kuiralabs/kuira-sdk-android — or, if time is short, a responsive PWA pay page with QR scan.
4. Optional: index contract state with EffectStream for a public "settlement feed" — https://docs.midnight.network/guides/index-state-with-effectstream .
5. Batch operations (multi-withdraw), invoice expiry reminders, CSV export of private records.
6. **Receivables proofs** (§16.4): `proveReceivablesAtLeast` + claim-kind badge on `/audit/<auditId>`.
7. Tests U-19, U-28 + proof-time benchmarks in README; final deck with the full three-wave story; Build Club application material.

**Acceptance:** a third party opens `/audit/<id>` and sees a verified "revenue ≥ X between dates" claim with no invoice data exposed; the video shows a USDM (or mock-stablecoin) invoice paid and withdrawn. A "receivables ≥ X" claim verifies the same way.

---

## 15. Wave 2 feature specifications

### 15.1 MCP server (`packages/mcp`)

- Transport: stdio. Tools (JSON schema in code): `create_invoice {amount: string, memo: string, expiresAt?: string}` → `{invoiceId, link}`; `get_invoice_status {invoiceId}`; `list_invoices {status?}`; `withdraw_invoice {invoiceId}`; `prove_revenue_at_least {threshold, invoiceIds?}` (Wave 3).
- Runs the Node provider stack (§8.3) with the merchant seed from env; requires the local proof server. Never expose seeds in tool outputs. Refuse to run if `TACITPAY_NETWORK=mainnet` and `TACITPAY_ALLOW_MAINNET` is unset.
- Ship a `claude_desktop_config.json` / Claude Code `.mcp.json` snippet in the README.

### 15.2 Node SDK (`packages/sdk`, npm `@tacitpay/node`)

Thin wrapper over `packages/api` with a zero-config constructor `new TacitPay({ network, seed, contractAddress? })`, typed errors, and `watchInvoice(id, cb)`. README with 10-line quickstart. Semantic versioning; publish `0.1.0` in Wave 2.

### 15.3 Optional relay (only if needed)

If merchants want payment notifications without keeping a browser open, add a tiny stateless relay that subscribes to `contractActions` for the contract and pushes status events. It must never receive invoice bodies or links; it only sees public state. Prefer no relay at all — the SDK's polling covers most needs.

### 15.4 DUST sponsorship

Follow https://docs.midnight.network/guides/dust-sponsorship . If the contract-side rule is compatible with `payInvoice`, add a merchant toggle "Cover the payer's network fee". This directly addresses "first-time user has no DUST" friction and scores on UX and Midnight-nativeness.

### 15.5 Milestone escrow (payer-gated release)

Turns the escrow the contract already holds into payment protection for milestone/deliverable work — freelance-escrow semantics with private amounts and no platform in the middle. Rides the same code area as the Variant B rework; implement them together.

- `InvoiceRecord` gains `releaseAfter: Uint<64>` (`0` = standard invoice; otherwise the unix time after which the merchant may withdraw without approval) and `released: Boolean`.
- `createInvoice` gains a `releaseAfter` parameter. UI: a "Require my client's approval before payout" toggle plus the timeout; the payer sees both in the link before paying.
- New circuit `approveRelease(invoiceId)`: asserts status PAID, checks `tagFor(payerPubKey(payerSecret()), invoiceId) == payerTag` (same pattern as `proveReceipt`), sets `released = true`.
- `withdraw` gate (INV-9): when `releaseAfter != 0`, require `released` or block time ≥ `releaseAfter`; assert message "Escrow not released".
- Say the semantics plainly in UI and README: the gate protects the *payer's leverage* (the merchant cannot take funds before approval or timeout); the remedy for non-delivery is a refund (§15.6). There is deliberately no arbitration — that is a feature, not an omission.

> **VERIFY (Wave 2, with Variant B):** the kernel construction for "block time ≥ t" (the standard library documents `blockTimeLt`; confirm the correct inverse-bound form), and the proof-size impact of the two extra `InvoiceRecord` fields.

### 15.6 Claim-based refunds

Refunds without ever touching the payer's Zswap key — the same insight that made withdrawal merchant-initiated (§5.3): the party who should *receive* a coin initiates the transaction, so their own wallet learns about it.

- `InvoiceStatus` gains `REFUNDABLE` and `REFUNDED`.
- `offerRefund(invoiceId)`: merchant-only (owner-tag check); allowed from PAID (released or not); sets REFUNDABLE. `withdraw` on a REFUNDABLE invoice fails.
- `claimRefund(invoiceId)`: payer-only (payer-tag check, INV-10); `sendShielded(escrowCoin → ownPublicKey())`, escrow entry removed, sets REFUNDED.
- UI: "Offer refund" on the merchant's PAID rows; "Refund offered — claim it" on the payer's `/receipts`.

### 15.7 Recurring invoices (series)

Retainers and subscriptions — the primary persona's actual income shape — with **zero new circuits**: every period is an ordinary invoice whose id and salt are *derived*.

- Merchant creates a series: `seriesSeed = random32()`, stored in private state (§7.1). Child *n*: `invoiceId_n = sha256("tacitpay:series:id:" ‖ seriesSeed ‖ n)`, `salt_n = sha256("tacitpay:series:salt:" ‖ seriesSeed ‖ n)`, memo = template + period label.
- The standing link (§7.3, `kind: "series"`) carries the seed and template; the payer's client computes the current period from `startAt`/`periodDays`, derives the child preimage, checks on-chain status, and pays. One link, every period.
- The merchant mints period *n* with an ordinary `createInvoice` (dashboard prompts "mint next period" when the previous one settles or the period rolls). If the payer opens the link before minting, the UI says "this period hasn't been issued yet" instead of attempting a failing transaction.
- Privacy (INV-11): on-chain, children are ordinary invoices with independent-looking ids and unlinkable tags; only seed-holders (merchant and payer) can correlate the series.

---

## 16. Wave 3 feature specifications

### 16.1 Audit proofs

- UI: merchant selects up to N invoices, enters threshold and optional date window (enforced client-side in Wave 3; on-chain `fromTime/toTime` stored as claim metadata), generates an **audit anchor** (random, per auditor) and shares `/audit/<auditId>` with the auditor.
- Verifier page shows: claim text, the proof transaction, the anchor, and the statement "The proof was verified by Midnight's validators; individual invoices and amounts are not disclosed."
- Benchmark N ∈ {4, 8, 16} proof times on the local proof server; choose the largest N under ~60 s.

### 16.2 USDM on Midnight (Verified Technical Specifications & Live Test Results)

**Live Verification Completed on 2026-08-22:**
- **Bridge Transaction (Cardano Preprod → Midnight Preview):**
  - Cardano Lock Tx Hash: `0c0de55f8cc83342c70a43ebb84c4189fc5d31382e0bb47a726fc454f5c5a352`
  - Minted Amount: `5.000000 USDM` (`5000000` base micro-units)
  - Recipient Midnight Address: `mn_addr_preview1u7tvpcd0d5wshpp7557t2spnffccr4qgvys7y2nfxj044sphugwsa94s0t`
  - On-Chain Verified Balance: `{ "003bacd9a361ba0d425e408776020e40271375e8b8de42d73eec046a44947d73": "5000000" }`
  - Wallet Sync: Verified against Preview Indexer (142,100 blocks synced from genesis; state cached).

**Network Parameters Established from Live Environment:**
- **USDM (Moneta Digital)** moves natively Cardano ↔ Midnight via VIA Labs' lock-and-mint bridge protocol using `@via-labs-tech/usdm-bridge`.
- **Decimals:** `6` across all chains (1 USDM = $10^6$ units).
- **Testnet (Cardano Preprod ↔ Midnight Preview):**
  - Cardano Chain ID: `2273266`
  - Cardano Lock-Release Policy ID: `76fbe9f6c8761cc6744c34a1f30915037e38c01197d6e7c9d2fcc1d3`
  - Midnight Chain ID: `64364450`
  - **USDM Gateway Contract:** `471dfe55c866fdbc085c9011a51f0cd0e9c9bfca6bb985c35f7716b6e73e485c`
  - **USDM Token Color (Preview):** `003bacd9a361ba0d425e408776020e40271375e8b8de42d73eec046a44947d73`
- **Mainnet (Cardano Mainnet ↔ Midnight Mainnet):**
  - Cardano Chain ID: `2273265`
  - Cardano Lock-Release Policy ID: `f8fe0d08c5f266f464254ee8d12fabec446fb71e19fdee5de30bd234`
  - Midnight Chain ID: `64364449`
  - **USDM Gateway Contract:** `65023744190a4fc7c8ac9a3dfbc8cfc28f63d2aaa431ceda1d88fdb9a096a6a1`
  - **USDM Token Color (Mainnet):** `8c2c22bc0c37fa999d0611cb5c570f587938ac5ffc8b0925143dad4c0764e94b`
- **Compact Contract Compatibility:**
  - `tacitpay.compact` is 100% token-agnostic: the constructor takes `paymentToken: Bytes<32>`, and `payInvoice` asserts `coin.color == paymentToken`.
  - Deploying an instance with `paymentToken = 0x003bacd9a361ba0d425e408776020e40271375e8b8de42d73eec046a44947d73` instantly enables native USDM settlement on Preview without any contract logic modifications.
- **SDK vs. Wallet Extension Execution (corrected 2026-08-26 — see DECISIONS D-020 correction + D-022):**
  - At the **Code / SDK level (`@midnight-ntwrk/wallet-sdk`)**, transaction building and payment execution are automated and programmatic. Shielding is **not**: the SDK exposes no self-shield primitive (`initSwap` is a documented two-party exchange), so bridged USDM stays unshielded — on public networks that is the only pool it can occupy. The earlier claim that shielding/unshielding were "completely automated" predated this audit and was wrong.
  - End-user browser wallet interactions (Lace) follow the standard DApp Connector flow. `receiveUnshielded` is no longer a contingency: it is the Wave 1 settlement lane (D-022), with USDM as the Preview payment token via `deploy --token 003bacd9a361ba0d425e408776020e40271375e8b8de42d73eec046a44947d73`.

### 16.3 Mobile

Kuira SDK (Android) repo: https://github.com/kuiralabs/kuira-sdk-android . Minimum: scan invoice QR → show amount/memo → pay. If the SDK's wallet model differs from Lace, scope to "view + verify" and keep paying on desktop.

### 16.4 Receivables proofs (prove what you're owed)

`proveRevenueAtLeast` proves money *received*; its sibling proves money *owed* — the underwriting primitive for receivables financing. A lender verifies "≥ X in open invoices, none expired" without seeing a single invoice: private credit data for the invoice economy.

- `proveReceivablesAtLeast(auditId, threshold, anchor)`: identical bounded-vector machinery to §6.8, with the per-slot status check requiring `OPEN` and not expired (`expiresAt == 0` or block time < `expiresAt`) instead of PAID/WITHDRAWN.
- Stored with `AuditClaim.kind = 1`; `/audit/<auditId>` renders "open receivables ≥ X" with the same verification statement as revenue claims.
- Benchmark in the same N sweep as §16.1; the two circuits share the ownership/commitment sub-checks in source.

---

## 17. Submission package

### 17.1 README outline (mandatory sections, in this order)

1. Title, one-liner, logo masthead, badges (license, status, Preview contract address link).
2. 90-second summary + the three paragraphs from §1.
3. **Why privacy is load-bearing** (condensed §4.2 table + §4.3 allowed-public list).
4. **Dual-ledger design** (§5.2 table) + Mermaid sequence diagram of create → pay → withdraw.
5. Contract walkthrough: each circuit, what it asserts, what it discloses, with links to the standard-library docs.
6. **How judges test it** — four paths, cheapest first: (a) unit tests only (no Docker, no wallet), (b) **Preview with 1AM — no Docker and no proof server at all** (in-browser WASM proving; wallet install + faucet links only), (c) Preview with Lace (adds the local proof-server setup unless the Day-3 VERIFY shows Lace now delegates proving), (d) local devnet integration (`yarn env:up` + `demo seed`). State the Docker requirement per path in one line each so a judge can pick before installing anything.
7. Test inventory (U-xx table with pass status) + privacy verification results.
8. Architecture & repo layout.
9. Roadmap across waves + link to `docs/WAVE-CHANGELOG.md`.
10. Known limitations (§4.5).
11. Attribution: "Built on Midnight — https://midnight.network ; Compact docs https://docs.midnight.network ; Midnight Expert used for verified Compact generation." License.

### 17.2 Deck outline (≤ 12 slides)

1 Title · 2 Problem (public ledgers publish your books) · 3 Why now (USDM on Midnight, Aug 2026) · 4 Product in one screen · 5 Privacy model (who sees what) · 6 Dual-ledger architecture · 7 Contract: circuits & disclosures · 8 Demo stills · 9 Tests & QA (numbers) · 10 Roadmap across 3 waves · 11 Market & adoption path (freelancers/SMEs paid in stablecoins; SDK/MCP distribution) · 12 Team & ask (Build Club).

### 17.3 Video script (3–5 minutes, one take, no music over narration)

0:00 Problem in one sentence · 0:30 Show `/merchant`: create invoice, highlight "only commitment goes on chain" (show explorer) · 1:15 Open link as payer, connect Lace, pay; show proof stepper · 2:15 Show `/verify`: PAID, and the explorer state with no amount · 2:45 Withdraw; Lace balance increases · 3:15 `yarn test` output scrolling (tests passing) · 3:40 Roadmap slide · 4:00 End card with repo, contract address, Discord handle.

### 17.4 Wave changelog format (`docs/WAVE-CHANGELOG.md`)

```
## Wave N (dates)
### Shipped
- ...
### Changed since Wave N-1
- ...
### Privacy posture change
| Data | Before | After |
### Tests
- added: ..., total passing: ...
### Known issues / next
```

---

## 18. Risks and decision rules

| Risk | Likelihood | Mitigation / rule |
|---|---|---|
| Shielded coin custody (`receiveShielded` + `insertCoin` + `sendShielded`) behaves differently than assumed | Medium | Day-2 spike on local devnet before any UI work. If not working by end of Day 3: fall back to **unshielded** NIGHT for Wave 1 (`receiveUnshielded`/`sendUnshielded`, amounts public), keep the commitment scheme for invoice contents, and state clearly that shielded settlement is the Wave 2 target. Record in DECISIONS.md. |
| DUST not available on Preview wallets in time | Medium | Register Day 0; develop on local devnet; demo can fall back to local devnet video with a note if Preview DUST fails. |
| tUSDM cannot be shielded in any wallet | Medium | Ship the unshielded-USDM circuit path (§16.2) and keep shielded tNIGHT as the full-privacy demo; state the limitation plainly. |
| Lace browser proving/balancing API differs from expectation | Medium | Mirror `example-bboard` UI wiring exactly; if the browser path blocks, ship the CLI flow in the video and keep the UI read-only for payment, with an explicit note. |
| Proof generation too slow for demo | Low | Keep circuits small; avoid large Vectors; benchmark; show the stepper. |
| Compiler upgrade mid-wave breaks artifacts | Low | Pin versions in `package.json` and `docs/DECISIONS.md`; upgrade only between waves. |
| Another team ships "private payments" | High | Differentiate on: unlinkable per-invoice tags, receipt proofs, audit proofs, SDK/MCP, tests, changelog quality. |
| Scope creep | High | Anything not in §14 for the current wave goes to `docs/BACKLOG.md`. |
| Milestone/refund states widen the contract state machine | Medium | Every new status transition ships with negative tests (U-20…U-26) before any UI work; the states land together with Variant B in Wave 2, never in Wave 1. |

Decision rule for any ambiguity not covered here: choose the option that (1) keeps the contract compiling, (2) keeps private data off the public ledger, (3) is simplest to test, in that order — and log it.

---

## 19. Official references index

**Midnight docs (all pages indexed at https://docs.midnight.network/llms.txt)**
- What is Midnight: https://docs.midnight.network/what-is-midnight
- Getting started / installation: https://docs.midnight.network/getting-started/installation
- Quickstart: https://docs.midnight.network/getting-started/quickstart
- Hello world (compile, local deploy): https://docs.midnight.network/getting-started/hello-world
- Tutorials index: https://docs.midnight.network/tutorials
- Examples index: https://docs.midnight.network/examples ; contracts: calculator, token transfers, private guest list, election, private reserve auction, battleship (under https://docs.midnight.network/examples/contracts/…); DApps: https://docs.midnight.network/examples/dapps
- Concepts (dual ledger, Zswap, DUST): https://docs.midnight.network/concepts , https://docs.midnight.network/concepts/ledgers , https://docs.midnight.network/concepts/zswap , https://docs.midnight.network/concepts/dust-architecture , https://docs.midnight.network/concepts/dual-component-tokenomics
- Guides index: https://docs.midnight.network/category/guides (networks & environments, fund a wallet, DUST sponsorship, security best practices, run proof server, local proving, Compact from JavaScript, deploy & operate, EffectStream, React/Next wallet connectors)
- Tokens: https://docs.midnight.network/tokens/overview , https://docs.midnight.network/tokens/shielded-token , https://docs.midnight.network/tokens/unshielded-token
- Compact: https://docs.midnight.network/compact ; reference https://docs.midnight.network/category/reference ; standard library https://docs.midnight.network/compact/standard-library and https://docs.midnight.network/compact/standard-library/exports ; ledger ADTs https://docs.midnight.network/compact/data-types/ledger-adt ; opaque types https://docs.midnight.network/compact/data-types/opaque_data ; compilation & tooling https://docs.midnight.network/category/compilation-and-tooling ; test & debug https://docs.midnight.network/compact/test-and-debug ; security https://docs.midnight.network/compact/smart-contract-security
- AI integration / Midnight Expert: https://docs.midnight.network/ai-integration/midnight-expert (marketplace https://midnightntwrk.expert/ ; source https://github.com/devrelaicom/midnight-expert)
- API references: Midnight.js https://docs.midnight.network/api-reference/midnight-js ; compact-runtime https://docs.midnight.network/api-reference/compact-runtime ; ledger https://docs.midnight.network/api-reference/ledger ; DApp connector https://docs.midnight.network/api-reference/dapp-connector ; indexer https://docs.midnight.network/api-reference/midnight-indexer ; testkit https://docs.midnight.network/api-reference/testkit-js ; error references https://docs.midnight.network/api-reference/error-reference/… 
- Release notes, compatibility matrix, environments: https://docs.midnight.network/relnotes/overview , https://docs.midnight.network/relnotes/support-matrix , https://docs.midnight.network/relnotes/network
- Troubleshooting: https://docs.midnight.network/category/troubleshoot ; Glossary: https://docs.midnight.network/glossary

**Repositories**
- Midnight GitHub org: https://github.com/midnightntwrk
- Compact compiler releases: https://github.com/midnightntwrk/compact/releases
- Local devnet: https://github.com/midnightntwrk/midnight-local-dev
- Example hello world: https://github.com/midnightntwrk/example-hello-world
- Example bulletin board (full DApp incl. browser wiring): https://github.com/midnightntwrk/example-bboard
- Awesome DApps (more examples): https://github.com/midnightntwrk/midnight-awesome-dapps
- Midnight.js: https://github.com/midnightntwrk/midnight-js ; Compact.js/SDK releases: https://github.com/midnightntwrk/midnight-sdk/releases ; wallet: https://github.com/midnightntwrk/midnight-wallet ; indexer: https://github.com/midnightntwrk/midnight-indexer ; ledger: https://github.com/midnightntwrk/midnight-ledger ; node: https://github.com/midnightntwrk/midnight-node
- OpenZeppelin contracts for Compact: https://docs.midnight.network/sdks/community/openzeppelin-compact-contracts
- Kuira SDK (mobile): https://github.com/kuiralabs/kuira-sdk-android
- EffectStream: https://github.com/effectstream/effectstream
- VIA Labs (USDM ↔ Midnight): https://developer.vialabs.tech/docs/ ; USDM bridge guide https://developer.vialabs.tech/docs/examples/guides/usdm-cardano-midnight ; Midnight overview https://developer.vialabs.tech/docs/examples/midnight/overview ; testnet tokens https://developer.vialabs.tech/docs/general/testnet-tokens ; transfer UI + faucets https://midnight.anytoany.xyz ; tUSDM faucet https://tusdm.moneta.global

**Program**
- Midnight Buildathon on AKINDO (program page, rules, rubric link, deadlines) — as registered by the author.
- Kickoff workshop registration: https://luma.com/midnight-buildathon
- Midnight Discord (builder support): https://discord.com/invite/midnightnetwork
- Midnight hackathon archive (what past winners did): https://midnight.network/hackathon

---

*End of PRD.*
