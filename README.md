<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo.svg" alt="TacitPay" height="48">
  </picture>
</p>

**Private invoicing & settlement on Midnight — private by default, provable on demand.**

![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Status](https://img.shields.io/badge/status-pre--Wave%201%20scaffold-orange)

> **Status:** repository scaffold for the [Midnight Buildathon 2026](https://docs.midnight.network) (AKINDO WaveHack, Waves 1–3, Aug 27 – Nov 27).
> The full product spec is in [`PRD.md`](./PRD.md) — the single source of truth for this project.
> Wave 1 implementation starts Aug 27; this README's placeholder sections fill in as it ships.

TacitPay lets a merchant issue an invoice and get paid in a stablecoin on Midnight so that _anyone_ can verify the invoice was settled, while the amount, the counterparties, and the invoice contents stay private — and the merchant can later prove facts about their revenue (e.g. "I received ≥ X this quarter") to an auditor without revealing the underlying invoices.

## Why privacy is load-bearing

On transparent chains, every stablecoin payment permanently publishes who paid whom, how much, and — via address clustering — a business's full revenue and customer list. That is why businesses that could benefit from instant stablecoin settlement mostly don't use it. The opposite extreme, fully anonymous payments, is unusable for legitimate businesses that must prove income to accountants, auditors and lenders.

TacitPay uses Midnight's dual-ledger model to hold both ends:

| Data                    | Public ledger                              | Payer                   | Merchant               | Verifier with a proof      |
| ----------------------- | ------------------------------------------ | ----------------------- | ---------------------- | -------------------------- |
| Invoice amount          | **Hidden** (commitment only)               | Known (from link)       | Known                  | Only the fact being proved |
| Memo / line items       | Hidden (hash inside commitment)            | Known                   | Known                  | Hidden                     |
| Merchant identity       | Hidden (per-invoice tag, unlinkable)       | Knows who sent the link | —                      | Only if merchant proves it |
| Payer identity          | Hidden (shielded payment, per-invoice tag) | —                       | Not learned from chain | Only if payer proves it    |
| Invoice exists + status | **Public by design**                       | Public                  | Public                 | Public                     |

The only values ever `disclose()`d are on the allowed-public list in PRD §4.3. The eight privacy invariants (INV-1…INV-8) each get a test — see [`docs/PRIVACY.md`](./docs/PRIVACY.md).

## Dual-ledger design

| Layer                                    | Holds                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Public ledger (Compact `ledger`)         | `invoices` map (ownerTag, commitment, status, expiry, payerTag), escrow, token colour, global counters |
| Zswap shielded ledger                    | The payment coin itself — amount and owner hidden by the protocol                                      |
| Private state (client device, encrypted) | Merchant: secret key, invoice bodies, salts, memos · Payer: secret key, receipts                       |
| Off-chain transport (URL fragment)       | The invoice link payload — never sent to any server                                                    |

More in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Contract

`contracts/tacitpay.compact` currently holds a **compiling placeholder**, verified locally with compact compiler 0.31.1. The Wave 1 circuits — `createInvoice`, `payInvoice`, `withdraw`, `cancelInvoice` with Variant A escrow — are specified in PRD §6 and land Days 1–2 of the wave.

## How to test (current scaffold)

```bash
corepack enable         # yarn 4.18.0 via packageManager field
yarn install
yarn compile            # requires the compact CLI — see PRD §0.2
yarn typecheck
yarn test               # unit tests (no network, no Docker)
yarn dev                # (inside packages/ui) landing page placeholder
```

Judge paths (a) unit-only, (b) local devnet integration, (c) Preview with Lace — including wallet setup, faucets and proof-server steps — are a Wave 1 deliverable (PRD §17.1).

## Test inventory

The Wave 1 unit matrix **U-01…U-17** (PRD §11.2) is pre-registered as vitest todos in `contracts/src/test/tacitpay.test.ts` and converts to real simulation tests as the contract lands. Current live tests: scaffold sanity + network-config guards.

## Repository layout

```
├── PRD.md                   product requirements — source of truth
├── docs/                    WAVE-CHANGELOG · DECISIONS · PRIVACY · ARCHITECTURE · DEMO-SCRIPT · BACKLOG
├── contracts/               tacitpay.compact · witnesses.ts · unit/simulation tests
├── packages/
│   ├── api/                 TacitPayApi — the only place circuit calls happen (PRD §8)
│   ├── ui/                  Vite + React 18 + Tailwind (PRD §9)
│   └── cli/                 deploy + invoice lifecycle for demos/tests (PRD §10)
├── deployments/             contract addresses per network (committed once deployed)
└── config/networks.json     endpoints per network (PRD §12.2)
```

`packages/sdk` (npm `@tacitpay/node`) and `packages/mcp` arrive in Wave 2.

## Roadmap

| Wave                | Theme                   | Highlights                                                               |
| ------------------- | ----------------------- | ------------------------------------------------------------------------ |
| 1 (Aug 27 – Sep 16) | The loop works          | Contract + tests, API, CLI, UI on Preview, Variant A escrow              |
| 2 (Sep 27 – Oct 17) | Developers and agents   | Variant B escrow, receipt proofs, Node SDK, MCP server, tUSDM on Preview |
| 3 (Oct 27 – Nov 16) | Prove it to the auditor | ZK revenue proofs, USDM on mainnet (stretch), mobile PoC                 |

Progress per wave: [`docs/WAVE-CHANGELOG.md`](./docs/WAVE-CHANGELOG.md).

## Known limitations

Stated openly per PRD §4.5: payment timing is correlatable ("some invoice got paid at time T"); anonymity sets are small on a young network; the merchant learns the payer's identity off-chain (normal commerce); Variant A escrow exposes the escrowed value until withdrawal (fixed by Variant B in Wave 2).

---

Built on [Midnight](https://midnight.network) · [Compact docs](https://docs.midnight.network) · Midnight Expert used for verified Compact generation.
Licensed under [Apache-2.0](./LICENSE).
