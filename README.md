<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo.svg" alt="TacitPay" height="48">
  </picture>
</p>

**Private invoicing & settlement on Midnight — private by default, provable on demand.**

![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Status](https://img.shields.io/badge/status-Wave%201%20in%20progress-yellow)
![Tests](https://img.shields.io/badge/unit%20tests-27%20passing-brightgreen)

> **Status:** Wave 1 of the [Midnight Buildathon 2026](https://docs.midnight.network) (AKINDO WaveHack, Waves 1–3, Aug 27 – Nov 27).
> The contract and its unit matrix are complete; the API, CLI and UI are landing, and the Preview deployment address appears here once deployed.
> The full product spec is in [`PRD.md`](./PRD.md) — the single source of truth for this project.

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

The only values ever `disclose()`d are on the allowed-public list in PRD §4.3. The eleven privacy invariants (INV-1…INV-11) each get a test — see [`docs/PRIVACY.md`](./docs/PRIVACY.md).

## Dual-ledger design

| Layer                                    | Holds                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Public ledger (Compact `ledger`)         | `invoices` map (ownerTag, commitment, status, expiry, payerTag), escrow, token colour, global counters |
| Zswap shielded ledger                    | The payment coin itself — amount and owner hidden by the protocol                                      |
| Private state (client device, encrypted) | Merchant: secret key, invoice bodies, salts, memos · Payer: secret key, receipts                       |
| Off-chain transport (URL fragment)       | The invoice link payload — never sent to any server                                                    |

More in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Contract

`contracts/tacitpay.compact` implements the four Wave 1 circuits — `createInvoice`, `payInvoice`, `withdraw`, `cancelInvoice` — with Variant A escrow, compiled by compact compiler 0.31.1 against `@midnight-ntwrk/compact-runtime` 0.16.0.

| Circuit         | Asserts                                                                           | Ever made public                             |
| --------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| `createInvoice` | id unused, amount > 0                                                             | invoice id, owner tag, expiry, commitment    |
| `payInvoice`    | invoice OPEN, not expired, commitment matches the preimage, coin colour and value | payer tag, status, escrowed coin (Variant A) |
| `withdraw`      | invoice PAID, caller's secret derives the stored owner tag                        | status                                       |
| `cancelInvoice` | invoice OPEN, caller's secret derives the stored owner tag                        | status                                       |

The amount, memo and both parties' secrets are never disclosed — only a `persistentCommit` of the invoice body reaches the ledger. Ownership is proven from the witness secret, never from `ownPublicKey()` (which is prover-supplied and so is not an authorization check).

## How to test

```bash
corepack enable         # yarn 4.18.0 via packageManager field
yarn install
yarn compile            # requires the compact CLI — see PRD §0.2
yarn typecheck
yarn test               # full unit suite — no network, no Docker, no wallet
yarn workspace @tacitpay/ui run dev    # the app on http://localhost:5173
```

Local devnet (only needed for integration tests and the judge sandbox):

```bash
git clone https://github.com/midnightntwrk/midnight-local-dev.git ../midnight-local-dev
yarn env:up             # node :9944 · indexer :8088 · proof server :6300
yarn env:status         # container state + live endpoint probes
yarn env:down
```

### Proving: you choose who generates the proof

Generating a ZK proof requires the private invoice data, so whoever proves it sees it. TacitPay never operates a prover — instead it feature-detects, in this order:

1. **In your wallet** — 1AM proves in-browser (WASM). No Docker, nothing leaves the tab.
2. **A local proof server** — `localhost:6300` via Docker. Required by Lace today; your data stays on your machine.
3. **A prover you host** — your own server over TLS, set in `/settings`.

The active tier is shown in the app. Full reasoning: PRD §4.1 and decision D-010.

## Test inventory

The unit matrix is **U-01…U-28** (PRD §11.2). Wave 1's rows are live; the Wave 2/3 rows stay pre-registered as vitest todos so progress is visible in every run.

| Suite          | Result                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| `contracts`    | **20 passed**, 10 todo — U-01…U-17 plus U-17b, all real; 2 sanity tests |
| `packages/api` | **7 passed**, 1 todo — network-config guards vs PRD §12.2               |

Every Wave 1 row runs offline in the pure-JS runtime — including the coin circuits (`receiveShielded`, `insertCoin`, `sendShielded`), so **nothing is deferred to the integration layer**. U-17 sweeps the serialized public state after a full lifecycle and asserts the amount (in four encodings), the memo hash, the salt and both secrets are absent. U-17b pins the Variant A exposure window below, so it stays a tested limitation rather than an assumption.

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

| Wave                | Theme                   | Highlights                                                                                                                          |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1 (Aug 27 – Sep 16) | The loop works          | Contract + tests, API, CLI, UI on Preview, Variant A escrow, judge sandbox                                                          |
| 2 (Sep 27 – Oct 17) | Developers and agents   | Milestone escrow, claim-based refunds, recurring invoices, Variant B escrow, receipt proofs, Node SDK, MCP server, tUSDM on Preview |
| 3 (Oct 27 – Nov 16) | Prove it to the auditor | ZK revenue & receivables proofs, USDM on mainnet (stretch), mobile PoC                                                              |

Progress per wave: [`docs/WAVE-CHANGELOG.md`](./docs/WAVE-CHANGELOG.md).

## Known limitations

Stated openly per PRD §4.5:

- **Payment timing is correlatable** — an observer learns "some invoice was paid at time T", never the amount or the parties.
- **Anonymity sets are small on a young network** — inherent to any new chain.
- **The merchant learns who the payer is** — off-chain, because they sent them the link. Normal commerce, not a chain leak.
- **Variant A escrow leaks while it holds the coin** — and more than value: the escrowed coin's nonce is public, so after a withdrawal an observer who guesses the merchant's Zswap key can confirm it against the withdrawal's coin commitment, linking that merchant's withdrawals in transaction history. Withdrawing does not undo it. Wave 2's Variant B escrow removes the exposure; test U-17b pins the current behaviour meanwhile.

---

Built on [Midnight](https://midnight.network) · [Compact docs](https://docs.midnight.network) · Midnight Expert used for verified Compact generation.
Licensed under [Apache-2.0](./LICENSE).
