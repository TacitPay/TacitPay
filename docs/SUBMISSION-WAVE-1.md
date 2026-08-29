# AKINDO submission, Wave 1

The text and links for the Wave 1 submission form, kept in the repo so Wave 2's
"what changed since the previous submission" (a hard AKINDO requirement) has
something exact to diff against. Fill the two bracketed items before submitting.

## Project

**TacitPay**: private invoicing and settlement on Midnight. Private by default,
provable on demand.

One party issues an invoice, the other settles it on-chain. Anyone can verify
the payment happened; nobody can read what it was for. What reaches the public
ledger is a commitment (a hash of the amount, the memo and a random salt), a
status flag and an expiry. The amount, the memo and both parties' identities
live in encrypted private state on the parties' own devices and are never
published, and TacitPay runs no server in the payment path: the invoice travels
as a link whose payload sits in the URL fragment, which browsers never transmit.

## Links

| Item                         | Where                                                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public repository            | https://github.com/TacitPay/TacitPay (Apache-2.0, topic `midnightntwrk`)                                                                                                                                                     |
| Live app (Preview testnet)   | https://app.tacitpay.xyz                                                                                                                                                                                                     |
| Documentation and whitepaper | https://docs.tacitpay.xyz                                                                                                                                                                                                    |
| Landing                      | https://tacitpay.xyz                                                                                                                                                                                                         |
| Preview contract             | `0847de8a3ad855db18622017f2333b673afd9a1a72e0127b3e766d0c23326d24` ([explorer](https://preview.midnightexplorer.com/contracts/0847de8a3ad855db18622017f2333b673afd9a1a72e0127b3e766d0c23326d24), `deployments/preview.json`) |
| Slide deck                   | `docs/deck/index.html` (twelve slides) and `docs/deck/demo.html` (the six slides used in the video); [hosted link]                                                                                                           |
| Demo video                   | [link]                                                                                                                                                                                                                       |

## The problem

Paying or getting paid in crypto gives you two bad options. On a transparent
chain, every payment publishes who paid whom and how much; fresh addresses do
not help, because clustering stitches the history back together, so your rate
card goes to your competitors and your client list to anyone who looks. On
private rails, the only proof you were paid is the other side's paperwork: a
signed receipt can be refused, disputed or faked by the two people who wrote
it, which is why auditors ask for bank statements, not receipts. Real
businesses need both at once: privacy from the world, proof on demand.

## The solution

The chain is the bank statement, a neutral witness neither party controls.
Today's problem is that everyone can read it. TacitPay keeps the witness and
drops the readability, with three promises:

- **Private by construction.** The chain holds a commitment, never the invoice.
- **Provable by anyone.** Settlement verifies at `/verify/<id>` with no wallet,
  no account and no permission: enough for an accountant, a counterparty or a
  court.
- **No server to trust.** The invoice travels as a link; proofs are generated
  in the user's wallet, on a local prover or on a server the user runs, never
  by TacitPay, because whoever proves sees the invoice.

## How it uses Midnight

- **Compact contract** (`contracts/tacitpay.compact`, compiler 0.31.1): six
  circuits, `createInvoice`, `payInvoice`, `withdraw`, `cancelInvoice` and an
  unshielded mirror pair (`payInvoiceUnshielded`, `withdrawUnshielded`).
  Ownership is proven from the witness secret, never from `ownPublicKey()`;
  tags hash a secret-derived key, never the secret; the invoice commitment is
  a `persistentCommit`, so it needs no `disclose()`.
- **Private-state management:** merchant and payer records live in Midnight's
  level-backed private-state provider, encrypted on the device under a
  passphrase that is stretched with PBKDF2 and never stored.
- **Dual-ledger model:** the public ledger holds the invoice map (owner tag,
  commitment, status, expiry, payer tag) and escrow; the shielded pool carries
  the payment coin on the shielded lane; the unshielded lane settles bridged
  USDM on Preview, where no user-side shielding path exists today.
- **Proving:** three feature-detected tiers through the DApp Connector API
  4.0.1: in-wallet (1AM, in-browser WASM), a local proof server, or a prover
  the user hosts. TacitPay never operates one.
- **Public reads** through the Midnight indexer (GraphQL and WebSocket); every
  mutation is confirmed against the ledger before the app reports success.
- **USDM:** Preview invoices are denominated in tUSDM, bridged from Cardano
  Preprod over the VIA Labs bridge.

## Progress completed during Wave 1

- **Contract and tests.** Six circuits with Variant A escrow; 28 contract
  unit tests (U-01 to U-17, U-17b, U-29 to U-36) that run in the pure-JS
  runtime with no Docker, no wallet and no network, including the coin
  circuits. U-17 serialises the public ledger after a full lifecycle and
  asserts the amount is absent in four encodings, along with the memo hash,
  the salt and both secrets.
- **The shared library** (`packages/api`): the only place circuit calls
  happen; strictly validated link codec; private-state records; ledger reads;
  status observables; 70 unit tests and a 67-test integration suite against a
  live devnet whose load-bearing assertion is that the merchant's balance
  increases after withdrawal.
- **The CLI** (`packages/cli`): deploy, the full lifecycle, DUST status,
  local funding, and the judge sandbox (`yarn demo:seed`: two funded wallets,
  a deployed contract, three invoices in known states, a ready pay link).
- **The web app** (`packages/ui`): Vite, React 18, Tailwind 4; ten routes
  (invoices, payments, verification, settings, profile, the frozen `/pay#…`
  and `/verify/:id`); wallet detection over `window.midnight`; live proving
  and network status in the header; a pay-page preflight for balance and
  DUST; honest sandbox and caution states throughout.
- **Live on Preview.** The contract was deployed on Aug 26. The complete browser
  lifecycle (create, pay, verify, withdraw) ran between two Lace wallets on
  Aug 27, every step confirmed on-chain.
- **Hosted:** app.tacitpay.xyz, docs.tacitpay.xyz (whitepaper, concepts,
  architecture, guides, reference), tacitpay.xyz.
- **Documentation:** README, PRD, PRIVACY (eleven invariants mapped to tests),
  ARCHITECTURE, DECISIONS (24 records), an external product audit and its
  response, and the product vision across three waves.

## How judges can test it

Four paths, cheapest first (README "How judges test it"): unit tests only
(`yarn install`, `yarn compile`, `yarn test`; no Docker, no wallet, about
three seconds); Preview with the 1AM wallet (no Docker, in-browser proving);
Preview with Lace; or the local devnet with the seeded judge sandbox.

## Known limitations, stated openly

On Preview the payment transfer itself is public (payer address and amount),
while the invoice's contents never touch the ledger on either lane. Midnight
core engineering confirmed on Aug 29 that the missing wallet-side shielding
step is a fixed-but-unreleased Wallet SDK gap, not a protocol limit; the fully
shielded lane runs on the local devnet and Wave 2 brings it to public networks
by two routes. The invoice link is a bearer credential (the app says so at the
copy moment). Private records live only in the browser profile that created
them until Wave 2's encrypted export. Variant A escrow exposes the escrowed
coin's nonce until Wave 2's Variant B. All of it is in the README and in
`docs/PRIVACY.md`.

## Roadmap

- **Wave 2, the product completes:** shielded settlement on public networks
  (native SDK shielding for programmatic wallets once the upstream fix ships,
  a contract-minted wrapper for browser wallets), funds safety (Variant B
  escrow, milestone release, claim-based refunds, a timeout escape hatch),
  zero-setup payers (sponsored DUST), secure links, invoice documents,
  encrypted backup, recurring invoices, receipt proofs, notifications and
  webhooks, then the Node SDK and the MCP server so software agents can
  invoice the way people do.
- **Wave 3, prove it to the auditor:** zero-knowledge revenue and receivables
  proofs, the rest of the invoice document, accounting exports, USDM on
  mainnet (stretch), and a mobile app as an installable PWA, with Android payments through Kuira.

## Submission checklist (PRD §2.2 and §2.4)

- [x] Public repository under Apache-2.0
- [x] README with setup, architecture, Midnight integration, judge paths
- [x] Slide deck (`docs/deck/index.html`, `docs/deck/demo.html`)
- [ ] Demo video link
- [x] Progress description (this file)
- [x] `midnightntwrk` topic on the repository (set 2026-08-29)
- [x] At least one Compact contract that compiles (six circuits, deployed)

---

# Product description (the whole product, not wave-specific)

## What it does

TacitPay is private invoicing and settlement on Midnight. One party issues an
invoice, the other settles it on-chain. What reaches the public ledger is a
commitment (a hash of the amount, the memo and a random salt), a status flag
and an expiry. The amount, the memo and both parties' identities stay in
encrypted private state on the parties' own devices and are never published.
Anyone can verify an invoice was paid, with no wallet, no account and no
permission. Nobody can read what it was for. The invoice travels as a link
whose payload sits in the URL fragment, which browsers never transmit, so
there is no server in the payment path and nothing for TacitPay to see or
leak. Proofs are generated in the user's wallet, on a local prover or on a
server the user runs, never by TacitPay.

## The problem it solves

Paying or getting paid in crypto gives you two bad options. On a transparent
chain, every payment permanently publishes who paid whom and how much; fresh
addresses do not help, because clustering stitches the history back together,
so your rate card goes to your competitors and your client list to anyone who
looks. On private rails, the only proof you were paid is the other side's
paperwork: a signed receipt can be refused, disputed or faked by the two people
who wrote it, which is why auditors ask for bank statements, not receipts.
Businesses need both at once: privacy from the world, proof on demand. The
chain is the bank statement, a neutral witness neither party controls; today's
problem is that everyone can read it. TacitPay keeps the witness and drops the
readability.

## Challenges I ran into

The hardest one was shielding. The payment circuit consumes a shielded coin,
and on Midnight's public testnets there is no supported way for an ordinary
user to obtain one: the faucet pays unshielded, Lace has no shield control,
and the Wallet SDK's shielding swap failed on every attempt. I diagnosed it
against the official docs, asked the community, and Midnight core engineering
confirmed it was a fixed-but-unreleased SDK bug, not a protocol limit. Rather
than wait, I added an unshielded settlement lane to the contract (two mirror
circuits) so Preview settles bridged USDM with the invoice contents still
private, and kept the fully shielded lane running on the local devnet.
Smaller battles: the Midnight WASM would not initialise under Vite; the
private-state provider needed an events polyfill; a wallet can return a
transaction id for a submission that never reaches any chain, so the app now
confirms every mutation against the ledger before reporting success; and
private state is per browser origin, which changed how the demo has to be run.

## Technologies I used

Compact (compiler 0.31.1) for the six-circuit contract; Midnight.js providers
(private state, public data, zk config, proof, wallet, submission); the
Midnight Wallet SDK and the DApp Connector API 4.0.1 for Lace and 1AM; the
Midnight indexer over GraphQL and WebSocket; the local proof server; USDM
bridged from Cardano Preprod over the VIA Labs bridge. The app is Vite, React
18, Tailwind 4, shadcn/ui and Iconsax, deployed as static files on Vercel. The
documentation site is Astro Starlight. Tests run on vitest in the pure-JS
Compact runtime, with an integration suite against a real devnet. Yarn 4
workspaces hold the contract, the shared library, the CLI, the app and the
docs.

## How we built it

Spec first: a product requirements document with the privacy model, the
allowed-public list and eleven privacy invariants, each mapped to a test.
Then the contract, then its unit matrix, then a single shared library
(`packages/api`) that is the only place a circuit is ever called, so the CLI,
the app and next wave's SDK and MCP server share one audited path. The CLI
proved the lifecycle against a devnet before any browser touched it; the app
came last, on top of proven plumbing, and was verified against real wallets
on Preview end to end. Every design decision is written down with its reason
(24 records so far), and an external product audit was answered point by
point and folded into the roadmap.

## What we learned

Private is not anonymous, and the difference is the product: parties are
unlinkable per invoice, and settlement is still provable to anyone. A
commitment on a public chain is worth more than a signed receipt, because a
receipt is the counterparty's word and a ledger is a neutral witness. Whoever
generates a zero-knowledge proof sees the data, so a privacy product must
never run the prover. On a young network, verify platform claims against the
source and the people who wrote it: what looked like a design boundary was a
known bug with a merged fix. And a simple form can sit on top of a deep
system; the depth belongs underneath, where the user never has to see it.

## What's next for TacitPay

Wave 1 makes invoices private. Wave 2 makes them complete: shielded settlement
on public networks by two routes (the fixed Wallet SDK for programmatic
wallets, a contract-minted wrapper for browser wallets), funds safety
(milestone escrow, claim-based refunds, a timeout escape hatch), zero-setup
payers through sponsored DUST, secure links, real invoice documents,
encrypted backup, recurring invoices, receipt proofs, notifications and
webhooks, then a Node SDK and an MCP server so software agents can invoice
the way people do. Wave 3 makes them provable: zero-knowledge revenue and
receivables proofs a merchant can hand to a lender or an auditor without
revealing a single invoice, accounting exports, USDM on mainnet, and a mobile app as an installable PWA (verification, QR, your books on a phone), with Android payments through Kuira.

---

The "Updates in this Wave" text lives in [`SUBMISSION-WAVE-1-UPDATES.md`](./SUBMISSION-WAVE-1-UPDATES.md).

---

# Milestones (form fields)

## 2nd Wave

Wave 2 (Sep 27 to Oct 17): the product completes. In order: (1) shielded settlement on public networks by two routes, native shielding through the fixed Wallet SDK for programmatic wallets (CLI, SDK, agents) and a contract-minted shielded wrapper for browser wallets, which turns on the greyed Private card so a merchant picks public or private settlement per invoice; (2) funds safety: Variant B escrow (no plaintext coin data in public state), milestone escrow with payer-approved release, claim-based refunds, and a timeout escape hatch so money can never get stuck; (3) zero-setup payers: sponsored DUST so a first-time payer pays from the first click, plus a guided wallet path; (4) secure links v2 (in-circuit invoice ids, link expiry and revocation, optional recipient binding) and invoice document v1 (number, dates, customer, line items, notes, all inside the same commitment); (5) encrypted backup and restore of private records across devices; (6) a public-state-only notifications relay and privacy-preserving webhooks; (7) a Node SDK on npm and an MCP server so software agents create, pay and reconcile invoices. Video: an agent creates an invoice from Claude Code, a client pays it privately on Preview, a milestone is approved and withdrawn, a refund is claimed, a retainer's second period is paid from one standing link.

## 3rd Wave

Wave 3 (Oct 27 to Nov 16): prove it to the auditor. (1) Zero-knowledge revenue proofs: a merchant proves "I received at least X between these dates" on chain, and a third party verifies it on a public page without seeing a single invoice; (2) receivables proofs, "at least X is outstanding, none expired", the underwriting primitive for invoice financing; (3) the rest of the invoice document: taxes and discounts, merchant profile and terms templates, PDF export, QR share, duplicate and template, attachments bound by hash; (4) reconciliation: search, tags, monthly statements, CSV and JSON exports, receipts, fiat value at pay time; (5) a mobile app as an installable PWA: verification, QR scanning and the merchant's own books on any phone, with payments on Android through the Kuira wallet; (6) trust before value: an independent Compact contract audit, a protocol version registry with a migration policy for old links, and the business-model decision; (7) USDM on mainnet as the stretch, validated on Preprod first. Video: a lender opens an audit page and sees a verified revenue claim with no invoice data exposed; a phone scans an invoice QR and verifies it; a real USDM invoice is paid and withdrawn.
