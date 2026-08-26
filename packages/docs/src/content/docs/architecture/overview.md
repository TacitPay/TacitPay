---
title: System overview
description: The four pieces of TacitPay, the four layers data lives in, and the one path every circuit call takes.
---

TacitPay ships as four pieces, each usable on its own:

| Piece                        | What it is                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `contracts/tacitpay.compact` | The protocol itself — six circuits, token-agnostic, the payment token fixed at deploy |
| `packages/api`               | The client library. **Every circuit call goes through it** — one path to audit        |
| `packages/cli`               | The whole lifecycle without a browser: deploy, invoice, pay, withdraw, seed a sandbox |
| `packages/ui`                | A reference web app. One way to use the protocol, not the only one                    |

The library is the integration surface on purpose. The app and the CLI are both just callers; an agent, a billing system or another product integrates at exactly the same boundary and inherits exactly the same privacy handling — there is no privileged path.

The whole system on one canvas — the link as the transport, every caller funnelling through one library, and what actually reaches the chain:

<img class="tp-img-light" src="/diagrams/tacitpay-architecture.png" alt="TacitPay architecture: the invoice link as transport, every caller funnelling through one client library, and only commitments, tags and statuses reaching the chain." />
<img class="tp-img-dark" src="/diagrams/tacitpay-architecture-dark.png" alt="TacitPay architecture: the invoice link as transport, every caller funnelling through one client library, and only commitments, tags and statuses reaching the chain." />

## Where data lives

| Layer                                    | Holds                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Public ledger (Compact `ledger`)         | The invoices map (tags, commitments, statuses, expiries), escrow, the token, counters |
| Zswap shielded ledger                    | The payment coin itself on the shielded lane — amount and owner protocol-hidden       |
| Private state (client device, encrypted) | Issuer: secret key, invoice bodies, salts, memos · Payer: secret key, receipts        |
| Off-chain transport (URL fragment)       | The invoice link payload — never sent to any server                                   |

Private state is encrypted at rest under a user passphrase that never leaves the device — and, by decision, never touches browser storage: it lives in memory for the session and is re-entered after a reload.

## The truth gate

Every mutation the app performs ends the same way: it polls the contract's public state through the app's own indexer connection until the ledger visibly shows the change, and fails loudly on a timeout. A success dialog therefore cannot lie — it reports what the chain holds, not what a wallet optimistically returned. The integration test suite applies the same standard, asserting that the issuer's balance actually **increases** on withdrawal rather than merely that a status flipped.

## Networks

The app speaks to a network through three endpoints — node RPC, indexer (GraphQL over HTTP + WS), and a proof server — declared per network in one configuration file, together with the payment token and which [settlement lane](/concepts/lanes/) that network uses. The UI routes payments and withdrawals by lane automatically; see [Networks & deployments](/reference/networks/) for the live table.

Until a wallet is connected and a contract address is configured, the app runs on an in-memory sandbox and says so on every affected screen — sandbox transactions are clearly marked simulated, and a real network's invoice cannot be paid from sandbox mode by construction.
