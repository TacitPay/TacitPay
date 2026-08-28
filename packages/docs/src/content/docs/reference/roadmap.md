---
title: Roadmap
description: The three Buildathon waves — what shipped, what is next, and what each wave proves.
---

TacitPay is being built through the Midnight Buildathon 2026 (AKINDO WaveHack), one wave at a time. Each wave has a thesis.

## Wave 1 — the loop works _(Aug 27 – Sep 16)_

**Shipped.** The contract with both settlement lanes, the unit matrix, the client library, the CLI and the web app — live on Preview since Aug 26 2026, with the complete browser lifecycle (create → pay → withdraw between two real wallets) run and ledger-confirmed on Aug 27. The judge sandbox seeds a full demo in one command.

## Wave 2 — developers and agents _(Sep 27 – Oct 17)_

The protocol grows edges other software can hold:

- **Shielded wrapper token** — deposit unshielded USDM, receive contract-minted shielded units: fully private settlement on public networks.
- **Variant B escrow** — removes the escrow-window linkability stated in the [FAQ](/reference/faq/).
- **Sponsored DUST** — a sponsor service pays transaction fees so a payer needs only the stablecoin, not a fee asset: web2 feel, web3 settlement.
- **Milestone escrow, claim-based refunds, recurring invoices.**
- **Node SDK (`@tacitpay/node`) and an MCP server** — agents issue and settle invoices the way a person does.
- **Private-state export/import** — the passphrase-loss mitigation.

## Wave 3 — prove it to the auditor _(Oct 27 – Nov 16)_

The reason privacy plus provability matters:

- **ZK revenue & receivables proofs** — "I received ≥ X this quarter", proven without revealing a single underlying invoice: the lender's, auditor's and tax season's view of a private book.
- **USDM on mainnet** (stretch) and a mobile proof-of-concept.

Progress per wave is kept in the repository's [`docs/WAVE-CHANGELOG.md`](https://github.com/TacitPay/TacitPay/blob/main/docs/WAVE-CHANGELOG.md).

What the waves add up to, axis by axis: [Where the invoice goes](https://github.com/TacitPay/TacitPay/blob/main/docs/VISION.md).
