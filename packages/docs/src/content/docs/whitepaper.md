---
title: 'Whitepaper'
description: 'TacitPay: private invoicing & settlement on Midnight. The full design — the disclosure model, the protocol, the settlement lanes, the privacy analysis and its stated limits.'
tableOfContents:
  maxHeadingLevel: 2
---

**TacitPay is a protocol for private invoicing and settlement on Midnight.** One party issues an invoice. Another settles it on-chain. What reaches the public ledger is a **commitment** — a hash of the amount, the memo and a random salt — plus a lifecycle status and an expiry. The amount, the memo and both parties' identities stay in private state on their own devices and are never published.

The point is holding two properties at once that normally conflict: **anyone can verify an invoice was settled**, while **nobody can see what it was for**. A transparent chain gives you the first and destroys the second. A fully anonymous one gives you the second and makes the first impossible.

## 1. The problem

On transparent chains, every stablecoin payment permanently publishes who paid whom, how much, and — via address clustering — the payee's entire income history and counterparty list. That is true whether the payee is a company, a two-person studio, a freelancer or an autonomous agent. Publishing your rate card to every competitor and your customer list to every recruiter is not a side effect anyone signed up for.

The opposite extreme does not work either. Fully anonymous payments cannot be shown to an accountant, an auditor, a lender or a counterparty in a dispute, so they are unusable for anyone who has to account for their income — which is nearly everyone.

An invoice is the natural unit at which to resolve this. It has a private body (what was billed, for what, by whom) and a public fact (it exists, and it was or was not settled). Those two halves want different ledgers — and Midnight is the chain that holds both.

## 2. Design goals

1. **Private by default.** No amount, memo, or party identity ever reaches the ledger in plaintext. The only values ever `disclose()`d are on an allowed-public list.
2. **Provable on demand.** Settlement status is public by design, and a third party can confirm it with nothing but the invoice ID — no wallet, no account, no permission.
3. **Nothing to trust.** No server in the payment path, no operator-run prover, no custodial keys. Every privacy claim should be structural — a thing the system _cannot_ do — rather than a policy promise.
4. **One auditable path.** Every circuit call goes through a single client library, so there is one place to audit how private data is handled.
5. **Honesty about limits.** Where privacy is partial (see [§8](#8-privacy-analysis-and-its-limits)), the limitation is stated in the product, the tests and this document — never papered over.

## 3. The disclosure model

The protocol's core object is one map entry on the public ledger:

```text
invoices[invoiceId] = {
  ownerTag,     // persistentHash([merchantPubKey, invoiceId])
  commitment,   // persistentCommit({ amount, memoHash }, salt)
  status,       // OPEN | PAID | WITHDRAWN | CANCELLED
  expiresAt,    // unix seconds; 0 = never
  payerTag,     // persistentHash([payerPubKey, invoiceId]); zero until paid
}
```

Three mechanisms carry the whole privacy argument:

**The commitment.** `persistentCommit` over the invoice body (amount + memo hash) with a random salt is _hiding_: the ledger stores it, but nothing about the amount or memo can be recovered from it. Paying later requires presenting the same preimage — the circuit checks it in zero knowledge, so the payer proves they know the invoice's contents without the chain ever learning them.

**The tags.** Each party's role key is derived from a device-held secret with domain separation (`tacitpay:merchant:` / `tacitpay:payer:`), and the on-chain tag is a hash of that key _with the invoice ID_. Two invoices from the same merchant therefore carry unrelated tags — an observer cannot cluster a merchant's invoices, and a payer's payments, by reading the ledger.

**The witness boundary.** Ownership is proven from the witness secret — never from `ownPublicKey()`, which is prover-supplied and therefore not an authorization check. The secrets themselves never appear in any circuit output.

What crosses the line, exhaustively: the invoice ID, the two tags, the commitment, the status, the expiry, the two global counters, and — on the unshielded lane only — the settlement amount (see [§5](#5-settlement-lanes)). Everything else is never sent.

## 4. The protocol

The contract is ~260 lines of Compact defining six exported circuits over the state above. In brief:

| Circuit                | Who calls it | It proves / enforces                                                                    |
| ---------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `createInvoice`        | Issuer       | ID unused, amount > 0; stores tag + commitment, status OPEN                             |
| `payInvoice`           | Payer        | Invoice OPEN, not expired, preimage matches commitment; escrows a shielded coin         |
| `payInvoiceUnshielded` | Payer        | Same validation; receives unshielded tokens, records the owed amount                    |
| `withdraw`             | Issuer       | Invoice PAID on the shielded lane; caller's secret derives the stored owner tag         |
| `withdrawUnshielded`   | Issuer       | Invoice PAID on the unshielded lane; same ownership proof; pays out to a chosen address |
| `cancelInvoice`        | Issuer       | Invoice OPEN; same ownership proof; marks CANCELLED                                     |

Each lane guards against the other: `withdraw` refuses an invoice paid unshielded and vice versa, so funds can never be claimed through the wrong door. The payment token is fixed at deployment in a `sealed` ledger cell — one contract, one denomination, checked on every payment.

The full circuit-by-circuit reference, with every assert and every disclosed value, is in [The contract](/architecture/contract/).

## 5. Settlement lanes

Midnight's ledger holds two pools: a **shielded** pool (amounts and owners hidden by the Zswap protocol) and an **unshielded** pool (transparent, like an ordinary chain). TacitPay settles through either — and is honest about what each hides. The invoice body is a **sealed envelope** in both lanes; the lane decides whether the _cash handover_ is also hidden:

- **Shielded lane** (`payInvoice` / `withdraw`): the payment coin itself is shielded — amount, payer and recipient of the transfer are hidden by the protocol. The full private story.
- **Unshielded lane** (`payInvoiceUnshielded` / `withdrawUnshielded`): the invoice contents stay exactly as private — but the token transfer itself is public, like paying a sealed-envelope invoice in cash across a counter. The transfer's amount and addresses are visible; the memo and the invoice's meaning are not.

Why both exist: on today's public testnets, no self-shielding operation is available to end users — faucets and the USDM bridge dispense unshielded funds, and the wallet SDK's unshielded-to-shielded swap is broken on stable releases through 1.2.0 (the upstream fix is merged and unreleased). Shielded tokens are their own category, minted by contracts. So the **Preview deployment settles in bridged USDM through the unshielded lane — by necessity, not compromise**, while the full shielded flow runs live on the local devnet, where genesis provides shielded funds. A contract-minted shielded wrapper token is the Wave 2 route to fully private settlement on public networks.

## 6. What TacitPay cannot see

Every payment product says it respects your privacy. TacitPay's claims are structural — there is no version of the system that could look:

- **No server.** Invoice details travel inside the link's URL fragment, which browsers never transmit. There is no backend to breach, subpoena, or quietly log — and no server appears anywhere in the payment path.
- **No prover.** Generating a proof requires the private data, so whoever proves sees. TacitPay never operates a prover. Proving happens in the wallet (1AM proves in-browser), against a local proof server on your machine (Lace's model), or on a server _you_ host — feature-detected in that order, with the active tier always shown in the app.
- **No keys.** Withdrawal is authorized by a secret that exists only on the issuer's device. Nobody at TacitPay can move funds, because there is nobody to ask.

## 7. Verification and the truth gate

Anyone holding an invoice ID can read its public record — status, expiry, commitment — directly from the chain through `/verify/<id>`, with no wallet and no account. This is the auditor's, accountant's and counterparty's entry point.

The product applies the same standard to itself: **the app only reports success the ledger can confirm.** Every mutation polls the contract's public state through the app's own indexer connection until the change is visible, and fails loudly if the transaction never lands. A wallet's optimistic "submitted" is never treated as truth.

## 8. Privacy analysis, and its limits

The repository maintains eleven privacy invariants (INV-1…INV-11), each pinned by a test. The load-bearing one serializes the entire public ledger after a full lifecycle and asserts the amount is absent in four separate encodings, along with the memo, the salt, both secrets and both parties' Zswap keys.

Stated limitations, kept openly:

- **Payment timing is correlatable.** An observer learns "some invoice was paid at time T" — never the amount or the parties (shielded lane), and never the memo (both lanes).
- **The unshielded lane's transfer is public.** By nature: amount and addresses of the settlement transfer are visible on that lane. The envelope stays sealed; the cash is visible.
- **Anonymity sets are small on a young network.** Inherent to any new chain.
- **Whoever issued the invoice learns who paid it** — off-chain, because they sent the link. Normal commerce, not a chain leak.
- **Variant A escrow leaks while it holds the coin.** The escrowed coin's nonce is public, so an observer who guesses the merchant's Zswap key can confirm it against a later withdrawal, linking that merchant's withdrawals. Wave 2's Variant B escrow removes the exposure; a test pins the current behaviour so it stays a tested limitation rather than an assumption.

## 9. Architecture

Four pieces, each usable on its own:

| Piece                        | What it is                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `contracts/tacitpay.compact` | The protocol itself — six circuits, token-agnostic, the payment token set at deploy |
| `packages/api`               | The client library. Every circuit call goes through it — one path to audit          |
| `packages/cli`               | The whole lifecycle without a browser — deploy, invoice, pay, withdraw, seed        |
| `packages/ui`                | A reference web app. One way to use the protocol, not the only one                  |

Data lives in four layers: the public ledger (tags, commitments, statuses, escrow), the Zswap shielded ledger (the payment coin on the shielded lane), encrypted private state on each party's device (secrets, invoice bodies, salts, receipts), and the URL fragment as the off-chain transport. See [System overview](/architecture/overview/) for the full picture.

## 10. Status and evidence

Wave 1 of the Midnight Buildathon (Aug 27 – Sep 16, 2026) shipped the working loop:

- **Live on Preview** since Aug 26 2026: contract [`0847de8a…326d24`](https://preview.midnightexplorer.com/contracts/241b760e380f86be5ed049e82ce2839decd199bd0c3b2427d77acd2d512a2df0), denominated in bridged USDM, both lanes compiled in.
- **The complete browser lifecycle ran live on Aug 27 2026**: invoice `084318a7…f0342` (2 tUSDM) was created, paid and withdrawn between two Lace wallets, every stage confirmed on-chain by the truth gate, and the final status confirmed independently by a third observer with no private state.
- **Tests:** 28 contract unit tests (plus pre-registered Wave 2/3 todos), 70 client-library unit tests, and 67 integration tests that run the same lifecycle against a live devnet — asserting, among other things, that the merchant's balance actually **increases** on withdrawal, not merely that a status flipped.

## 11. Roadmap

| Wave                | Theme                   | Highlights                                                                                                         |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1 (Aug 27 – Sep 16) | The loop works          | Contract + tests, client library, CLI, app live on Preview, both settlement lanes, judge sandbox                   |
| 2 (Sep 27 – Oct 17) | Developers and agents   | Shielded wrapper token, Variant B escrow, sponsored DUST fees, milestone escrow, recurring invoices, Node SDK, MCP |
| 3 (Oct 27 – Nov 16) | Prove it to the auditor | ZK revenue & receivables proofs ("I received ≥ X this quarter"), USDM on mainnet (stretch), mobile PoC             |

---

_TacitPay is open source under Apache-2.0. The repository — including the PRD this document distils, the decision log and the privacy test matrix — is at [github.com/TacitPay/TacitPay](https://github.com/TacitPay/TacitPay)._
