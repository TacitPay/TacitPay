# Audit response — August 28, 2026

An external product audit of TacitPay arrived on Aug 28, 2026, one week before
the Wave 1 demo recording. This document is the response: every audit point
triaged into **already true**, **ships in Wave 1** (this week), **Wave 2
core**, **Wave 3**, or **deliberately not yet** — each verdict cross-checked
against what Midnight can actually do today (official docs, re-verified
Aug 28; sources at the bottom).

The audit's own completion test is adopted verbatim as the product's
definition of done — see PRD §3.5. Its build order survives contact with the
platform almost intact; where it doesn't, the reason is stated here.

## The one-sentence verdict

The audit asks TacitPay to become a complete product, not a better demo. It
is right. Almost everything it demands was already designed in PRD §15–§16;
what changes is the **order** — product completeness (private settlement,
funds safety, zero-setup payers, recovery) now explicitly outranks developer
surface (SDK, MCP, checkout embeds) inside Wave 2.

## Triage of the eleven points

| #   | Audit point                                     | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Zero-setup payer onboarding                     | **Split.** Contract/network auto-selection and automatic proving resolution are already true (baked Preview address; the invoice link carries its network; the header Proving chip resolves each wallet's capability at runtime). **Balance + DUST preflight with a guided funding path shipped this week** on the pay page. Sponsored DUST is Wave 2 §15.4 — the official guide and reference repo exist (see cross-check). Wallet-path guidance beyond the chip joins the Wave 2 onboarding bundle.                                                                                                                                            |
| 2   | Genuinely private settlement on public networks | **Wave 2, slot 1 — confirmed as the top priority.** Platform fact: on today's public testnets no user-side operation converts unshielded funds to shielded (the faucet is unshielded-only; the SDK's shielding swap is broken on stable releases through 1.2.0, fix merged upstream and unreleased). Today the only working crossing is **contract minting shielded value** — exactly the planned wrapper (BACKLOG "Shield funds", D-022), which then powers per-invoice settlement enforcement. The create dialog already shows the settlement pair with Private greyed under "Coming in Wave 2"; the pay page already names the spending pool. |
| 3   | Complete funds-safety lifecycle                 | **Wave 2 core, promoted from optional.** Milestone release (§15.5), claim-based refunds (§15.6) and a timeout escape hatch are now Wave 2 acceptance criteria, not stretch. Already true today: the pay circuit asserts OPEN status (double-pay impossible on-chain), unpaid expiry strands nothing (no funds move until pay), and cancel exists. Orphaned-local-record cleanup rides along in Wave 2.                                                                                                                                                                                                                                           |
| 4   | Secure invoice links                            | **Split.** The threat model was already documented (PRIVACY.md §6.6: the link is a bearer credential). **The UI now says it at the copy moment** (shipped this week). In-circuit ID authentication, signed payloads, revocation/rotation, and recipient binding are Wave 2 §15.8 — they need circuit changes and the contract is frozen until after submission.                                                                                                                                                                                                                                                                                  |
| 5   | Durable private-state recovery                  | **Wave 2, near the top.** Encrypted export/import touches the storage layer the demo depends on — wrong week to open it. **This week the backup card stopped over-promising**: it now states plainly that this browser profile is the only copy. Spec: §15.9 (versioned format, integrity check on import, passphrase rotation, reminders).                                                                                                                                                                                                                                                                                                      |
| 6   | Notifications without surrendering privacy      | **Wave 2 (§15.3), unchanged scope** — the audit endorses the design already in the PRD: a relay that sees only public state, never bodies, links or identities. Webhooks land with it.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7   | Real invoice documents                          | **Wave 2 for the fields, Wave 3 for the rest.** The document fields (number, dates, customer, line items, notes) fold into the existing commitment via `memoHash`, so they need no circuit change; they ship on the same `v: 2` payload bump as secure links (PRD §15.11). PDF, QR, templates and attachments-by-hash follow in Wave 3. Not before the demo: changing the payload schema days before the take would break the frozen link format and the deployed e2e invoice.                                                                                                                                                                   |
| 8   | Reconciliation and accounting                   | **Wave 3**, on top of the Wave 2 backup/export machinery (records first, exports second — the audit's own sequencing). ZK revenue/receivables proofs stay the Wave 3 flagship (§16.1).                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 9   | Recurring commercial relationships              | **Wave 2 (§15.7), unchanged** — the series-seed design needs zero new circuits and the audit endorses it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 10  | Developer integration surface                   | **Wave 2, after product core.** SDK and MCP stay in Wave 2 (they are also judge-visible for a buildathon about agents); **webhooks and an embeddable checkout button are added** (§15.10). Hosted/self-hosted docs follow in Wave 3.                                                                                                                                                                                                                                                                                                                                                                                                             |
| 11  | Trust, upgrades and commercial model            | **Standing track, started now.** The threat model already lives in PRIVACY.md; this document is the audit-history seed. Added to the roadmap: protocol version registry + migration policy (Wave 2), independent contract audit + business-model decision (Wave 3, before any mainnet value). "Who funds sponsored DUST" is recorded as the open question it is.                                                                                                                                                                                                                                                                                 |

## What shipped this week (Wave 1 close-out, Aug 28)

1. **Pay-page preflight** — before the wallet is asked to balance anything,
   the page checks the connected wallet's balance in the invoice's settlement
   pool and its DUST, and explains a shortfall in token terms with the real
   funding path (tUSDM faucet → USDM bridge on Preview; `yarn demo:seed` on
   local). Advisory only: the wallet stays the final authority, and a wallet
   that exposes no balances triggers no warning. Closes the BACKLOG
   "[Wave 1 polish] Pay-page balance pre-check".
2. **Bearer-link honesty at the copy moment** — the create dialog now says
   "anyone holding this link can read the amount and memo and pay the
   invoice" exactly where the link leaves the app.
3. **The backup card stopped over-promising** — it names the loss model
   (this browser profile is the only copy) and wears the same "Coming in
   Wave 2" tag as the settlement pair, instead of a toast.
4. **The passphrase form knows setting from asking-again** — the first
   successful unlock leaves a non-secret breadcrumb per wallet, so returning
   users are asked for "the passphrase you set on this device" instead of
   being invited to choose a new one; and the wrong-passphrase failure
   (verified against the level provider: an opaque WebCrypto
   `OperationError` on reads, while writes quietly succeed) is now mapped to
   a plain-English message naming the real cause. The write-side pre-check
   is a Wave 2 backlog item riding with §15.9.

Deliberately **not** touched this week, to protect the demo: the invoice
payload schema, the contract and its compiler (0.31.1 stays until
post-submission), the private-state storage layer, and the wallet balancing
call path (the balancing-stage timeout moves to Wave 2 with its reason).

## Wave 2 build order (revised)

Product completeness first, developer surface second:

1. Shielded settlement on public networks: native SDK shielding for
   programmatic wallets once midnight-wallet PR #615 ships (canary retest
   first, PRD §15.12) and the contract-minted wrapper for browser wallets →
   per-invoice settlement enforcement.
2. Funds safety: Variant B escrow, milestone release, claim-based refunds,
   timeout escape hatch, orphaned-record cleanup.
3. Zero-setup payer: sponsored DUST service, guided wallet path, prover
   pre-warming, balancing timeout.
4. Secure links v2 (§15.8) and invoice document v1 (§15.11) on one `v: 2`
   payload bump: in-circuit ID auth, expiry/revocation, optional recipient
   binding; number, dates, customer, line items, notes.
5. Encrypted backup/export/import (§15.9).
6. Notifications relay + privacy-preserving webhooks (§15.3, §15.10).
7. SDK, MCP server, embeddable checkout (§15.1, §15.2, §15.10).

## Deliberately not building yet

Unchanged from PRD §1.1 and re-affirmed against the audit's "what not to
build" list: cards, gift instruments, oracle conversion, custodial checkout,
in-app AI assistant, merchant super-app surface, additional tokens beyond
NIGHT/USDM, team accounts. The primary loop completes first.

## Platform cross-check (what Midnight actually supports, verified Aug 28)

- **Pools don't cross by user action today.** The faucet dispenses unshielded
  only ("rejects shielded and DUST addresses"), Lace has no shield UI, and
  the Wallet SDK's unshielded-to-shielded `initSwap` was broken on Preview
  through 1.2.0 (core engineering, Aug 29: fixed in midnight-wallet PR #615,
  unreleased; canary may carry it). So on Preview today the only working
  crossing is contract minting, which is why the wrapper is Wave 2 slot 1
  for browser wallets; programmatic wallets gain native shielding when the
  SDK fix ships. (docs.midnight.network/guides/acquire-tokens; Wallet SDK
  1.0 release notes; servicedesk #99)
- **Confirmed by the Midnight community (Discord, Aug 29).** The reply to our
  shielding question: tNIGHT is unshielded by nature; users obtain it at their
  unshielded address, register it for DUST, and the ZK side of a dApp runs on
  DUST, not on shielded value. That is precisely the D-020/D-022 architecture:
  contents private through commitments, settlement on the unshielded lane,
  shielded value on public networks only via contract minting (Wave 2). The
  Academy's Wallet SDK course frames the same three-token model
  (NIGHT / shielded / DUST). (academy.midnight.network)
- **DUST sponsorship is real and dApp-layer.** The user proves, balances and
  binds; the sponsor adds a DUST-only fee offer and submits — no wallet
  support required, and authorization must come from a proven secret, never
  `ownPublicKey()`. Reference: `midnightntwrk/example-private-party`.
  (docs.midnight.network/guides/dust-sponsorship)
- **Wallet capabilities differ exactly as the audit says.** Per the official
  matrix: Lace has no in-browser proving and needs a local proof server; 1AM
  proves in-browser (WASM) with none; Kuira proves on-device on Android
  (alpha). TacitPay's header Proving chip already resolves this per wallet at
  runtime — the Wave 2 onboarding bundle builds the guided path on top.
  (docs.midnight.network/sdks/community/wallets/community-wallets-reference)
- **DUST accrues, it isn't dispensed.** Registered NIGHT fills a DUST tank
  over time up to a cap; a brand-new wallet genuinely waits. That wait is the
  exact wall sponsorship removes. (docs.midnight.network/guides/acquire-tokens)
