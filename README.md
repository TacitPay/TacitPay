<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo.svg" alt="TacitPay" height="48">
  </picture>
</p>

**Private invoicing & settlement on Midnight — private by default, provable on demand.**

![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Status](https://img.shields.io/badge/status-Wave%201%20in%20progress-yellow)
![Tests](https://img.shields.io/badge/tests-86%20unit%20%C2%B7%2067%20integration-brightgreen)

> **Status:** Wave 1 of the [Midnight Buildathon 2026](https://docs.midnight.network) (AKINDO WaveHack, Waves 1–3, Aug 27 – Nov 27).
> The contract, its unit matrix, the client library, the CLI and the web app are all built and tested — and **live on Preview** since Aug 26 2026. Current contract: [`0847de8a…326d24`](https://preview.midnightexplorer.com/contracts/0847de8a3ad855db18622017f2333b673afd9a1a72e0127b3e766d0c23326d24) (`deployments/preview.json`) — v2, carrying both settlement lanes and denominated in bridged USDM (D-022). Its v1 predecessor (`1f3783…bc547`) hosted the first real in-browser invoice, created and proved from a Lace wallet on day one.
> The full product spec is in [`PRD.md`](./PRD.md) — the single source of truth for this project.

TacitPay is a **protocol for private invoicing and settlement** on Midnight.

One party issues an invoice. Another settles it on-chain. What reaches the public ledger is a **commitment** — a hash of the amount, the memo and a random salt — plus a status flag and an expiry. The amount, the memo and both parties' identities stay in private state on their own devices and are never published.

The point is holding two things at once that normally conflict: **anyone can verify an invoice was settled**, while **nobody can see what it was for**. A transparent chain gives you the first and destroys the second. A fully anonymous one gives you the second and makes the first impossible.

### Who this is for

It is not a merchant app. The protocol knows exactly two roles — whoever issued an invoice, and whoever paid it — and it does not care what either of them is. (The contract and the code call the issuing role _merchant_, because that is what the witness and the owner tag are named. Read it as "issuer" everywhere.)

- **Anyone who bills anyone.** Freelancers, contractors, agencies, suppliers, B2B counterparties. The invoice is the unit; the business model behind it is none of the protocol's business.
- **Anyone who pays.** Payers get their own private receipts and the same unlinkability the issuer does. This is not a one-sided privacy guarantee.
- **Anyone who needs to verify.** `/verify/<id>` needs no wallet, no account and no permission. A third party — a counterparty, an accountant, a court — can confirm settlement without learning anything else.
- **Software, not just people.** `packages/api` is the integration surface, and it is the only place a circuit call happens. Wave 2 adds an npm SDK and an MCP server so agents can issue and settle invoices the same way a person does.
- **Auditors and lenders**, in Wave 3: prove facts about revenue — "I received ≥ X this quarter" — without revealing a single underlying invoice.

### What ships

Five pieces, each usable on its own:

| Piece                        | What it is                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `contracts/tacitpay.compact` | The protocol itself — six circuits, token-agnostic, the payment token set at deploy    |
| `packages/api`               | The client library. Every circuit call goes through it, so there is one path to audit  |
| `packages/cli`               | The whole lifecycle without a browser — deploy, invoice, pay, withdraw, seed a sandbox |
| `packages/ui`                | A reference web app. One way to use the protocol, not the only one                     |
| `packages/docs`              | The whitepaper & documentation site — [docs.tacitpay.xyz](https://docs.tacitpay.xyz)   |

## Why privacy is load-bearing

On transparent chains, every stablecoin payment permanently publishes who paid whom, how much, and — via address clustering — the payee's entire income history and counterparty list. That is true whether the payee is a company, a two-person studio, a freelancer or an autonomous agent, and it is why most of them settle in stablecoins reluctantly or not at all. Publishing your rate card to every competitor and your customer list to every recruiter is not a side effect anyone signed up for.

The opposite extreme does not work either. Fully anonymous payments cannot be shown to an accountant, an auditor, a lender or a counterparty in a dispute, so they are unusable for anyone who has to account for their income — which is nearly everyone.

TacitPay uses Midnight's dual-ledger model to hold both ends:

| Data                    | Public ledger                              | Payer                   | Merchant               | Verifier with a proof      |
| ----------------------- | ------------------------------------------ | ----------------------- | ---------------------- | -------------------------- |
| Invoice amount          | **Hidden** (commitment only)               | Known (from link)       | Known                  | Only the fact being proved |
| Memo / line items       | Hidden (hash inside commitment)            | Known                   | Known                  | Hidden                     |
| Merchant identity       | Hidden (per-invoice tag, unlinkable)       | Knows who sent the link | —                      | Only if merchant proves it |
| Payer identity          | Hidden (shielded payment, per-invoice tag) | —                       | Not learned from chain | Only if payer proves it    |
| Invoice exists + status | **Public by design**                       | Public                  | Public                 | Public                     |

The only values ever `disclose()`d are on the allowed-public list in PRD §4.3. The eleven privacy invariants (INV-1…INV-11) each get a test — see [`docs/PRIVACY.md`](./docs/PRIVACY.md).

<a href="./docs/tacitpay-privacy-map-dark.png">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/tacitpay-privacy-map-dark.png">
    <img src="./docs/tacitpay-privacy-map.png" alt="Who sees what — TacitPay's four data layers">
  </picture>
</a>

## Dual-ledger design

| Layer                                    | Holds                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Public ledger (Compact `ledger`)         | `invoices` map (ownerTag, commitment, status, expiry, payerTag), escrow, token colour, global counters |
| Zswap shielded ledger                    | The payment coin itself — amount and owner hidden by the protocol                                      |
| Private state (client device, encrypted) | Merchant: secret key, invoice bodies, salts, memos · Payer: secret key, receipts                       |
| Off-chain transport (URL fragment)       | The invoice link payload — never sent to any server                                                    |

The whole system on one canvas — the link as the transport, every caller
funnelling through one API, the six providers, and what actually reaches the
chain:

<a href="./docs/tacitpay-architecture-dark.png">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/tacitpay-architecture-dark.png">
    <img src="./docs/tacitpay-architecture.png" alt="TacitPay architecture">
  </picture>
</a>

<sub>Follows your color scheme · editable sources: [`dark`](./docs/tacitpay-architecture-dark.excalidraw) · [`light`](./docs/tacitpay-architecture.excalidraw) — open them at [excalidraw.com](https://excalidraw.com).</sub>

More in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), which expands each
circuit into its own diagram derived from the code.

## Contract

`contracts/tacitpay.compact` implements six circuits — the four core ones (`createInvoice`, `payInvoice`, `withdraw`, `cancelInvoice`) plus the unshielded-lane pair (`payInvoiceUnshielded`, `withdrawUnshielded`, per D-022) — with Variant A escrow, compiled by compact compiler 0.31.1 against `@midnight-ntwrk/compact-runtime` 0.16.0.

| Circuit                | Asserts                                                                           | Ever made public                                         |
| ---------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `createInvoice`        | id unused, amount > 0                                                             | invoice id, owner tag, expiry, commitment                |
| `payInvoice`           | invoice OPEN, not expired, commitment matches the preimage, coin colour and value | payer tag, status, escrowed coin (Variant A)             |
| `payInvoiceUnshielded` | invoice OPEN, not expired, commitment matches the preimage                        | payer tag, status, owed amount (public by lane's nature) |
| `withdraw`             | invoice PAID on the shielded lane, caller's secret derives the stored owner tag   | status                                                   |
| `withdrawUnshielded`   | invoice PAID on the unshielded lane, caller's secret derives the stored owner tag | status, payout to the merchant-chosen address            |
| `cancelInvoice`        | invoice OPEN, caller's secret derives the stored owner tag                        | status                                                   |

Each lane guards the other's exit — `withdraw` refuses an invoice paid unshielded and vice versa — so funds can never be claimed through the wrong door.

The amount, memo and both parties' secrets are never disclosed — only a `persistentCommit` of the invoice body reaches the ledger. Ownership is proven from the witness secret, never from `ownPublicKey()` (which is prover-supplied and so is not an authorization check).

## How judges test it

Four paths, cheapest first. Pick one before installing anything.

| Path                     | What you need                           | Docker?                                                                                                                                 | What it proves                                                           |
| ------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **a. Unit tests only**   | Node and yarn                           | **No** — and no wallet                                                                                                                  | The contract is correct and leaks nothing. 86 tests, about three seconds |
| **b. Preview with 1AM**  | The 1AM wallet extension, testnet funds | **No** — proving is in-browser WASM                                                                                                     | The whole product, with nothing to install but a browser extension       |
| **c. Preview with Lace** | The Lace extension, testnet funds       | **No** — Lace 4.0.1 proves in-wallet (verified Aug 26); its Midnight settings can also point at Midnight's remote prover or a local one | The same, on the wallet most people already have                         |
| **d. Local devnet**      | Docker, `../midnight-local-dev`         | **Yes** — node, indexer and proof server                                                                                                | Everything, against a real chain you control, with a seeded sandbox      |

Path (a) needs no network at all and is the fastest way to check the privacy
claim: `U-17` runs a full lifecycle, serialises the public ledger, and asserts
the amount is absent in four separate encodings along with the memo, the salt,
both secrets and both parties' Zswap keys.

Path (d) is the fastest way to see the whole thing work: `yarn demo:seed`
leaves three invoices in known states and prints a ready-to-open pay link.

### Verified against a real wallet — and the one prerequisite for paying

On Aug 26 2026 the browser write path met its first real wallet: Lace 4.0.1
connected, matched network ids, proved **in-wallet**, and created an invoice on
Preview (block 587,108) — confirmed independently by the CLI's ledger read and
the public explorer. Two things that first contact taught, worth knowing before
you test:

- **Public-network payments settle in a stablecoin through the unshielded
  lane — by design, not compromise (D-020 → D-022).** No self-shielding
  operation exists in the protocol's current design: the faucet dispenses
  transparent tNIGHT, the Wallet SDK offers no shield/convert primitive —
  `transferTransaction` sources each output from its own pool, and `initSwap`
  is documented as a two-party atomic exchange, so a single-sided "shielding
  swap" is correctly rejected by the node. Shielded tokens are their own
  category, minted by contracts; the devnet's shielded native funds are a
  genesis artifact. So Preview invoices are denominated in bridged USDM and
  settle through the contract's unshielded lane — and the **complete browser
  lifecycle ran live on Aug 27 2026**: invoice `084318a7…f0342`
  ("design retainer - august", 2 tUSDM) was created, paid and withdrawn
  between two Lace wallets on contract `0847de8a…326d24`, every stage
  confirmed on-chain by the truth gate. The full shielded flow stays live on
  the local devnet, and a contract-minted shielded wrapper is the Wave 2 road
  to private settlement on public networks.
- **The app only reports success the ledger can confirm.** Every mutation polls
  the contract's public state through the app's own indexer connection and
  fails loudly if the transaction never lands — a wallet's optimistic "submitted"
  is not treated as truth.

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
yarn demo:seed          # judge sandbox — see below
TACITPAY_INT=1 yarn workspace @tacitpay/api run test   # live lifecycle, ~2 min
yarn env:down
```

### Judge sandbox

`yarn demo:seed` funds two wallets (including DUST, waiting until they can actually transact), deploys a contract, and leaves three invoices in known states — one OPEN, one PAID, one WITHDRAWN. It prints the contract address, the invoice IDs, and a ready-to-open `/pay#…` link, so the whole product is explorable in minutes without hand-driving a wallet. Re-running reuses the sandbox in seconds; `--reset` starts fresh.

### Pointing the app at a real contract

Out of the box the app runs on an in-memory mock, so every screen is explorable
with no chain at all. To connect it to one, open `/settings` → **Contract
connection**, paste a deployed contract address (`yarn demo:seed` prints one for
a local devnet; the live Preview address is in `deployments/preview.json`),
connect a wallet, and unlock your private state with a passphrase. **Until the
Settings card shows the "Live" badge, every write — including invoice creation
— is sandbox theater**: it runs on the mock and touches no chain.

That passphrase encrypts invoice bodies, salts and memos in this browser. It is
never transmitted and cannot be recovered — see D-014. For a public deployment,
bake the address in at build time instead:

```bash
VITE_TACITPAY_CONTRACT_PREVIEW=<address> yarn workspace @tacitpay/ui run build
```

The chain code is behind a dynamic import, so a visitor to the marketing page
downloads a 23.1 kB entry chunk and never fetches the Midnight stack unless
they connect.

### Proving: you choose who generates the proof

Generating a ZK proof requires the private invoice data, so whoever proves it sees it. TacitPay never operates a prover — instead it feature-detects, in this order:

1. **In your wallet** — 1AM proves in-browser (WASM). No Docker, nothing leaves the tab.
2. **A local proof server** — `localhost:6300` via Docker. Required by Lace today; your data stays on your machine.
3. **A prover you host** — your own server over TLS, set in `/settings`.

The active tier is shown in the app. Full reasoning: PRD §4.1 and decision D-010.

## Test inventory

The unit matrix is **U-01…U-36** (PRD §11.2). Wave 1's rows are live; the Wave 2/3 rows stay pre-registered as vitest todos so progress is visible in every run.

| Suite                        | Result                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `contracts` (unit)           | **28 passed**, 10 todo — U-01…U-17 plus U-17b and the unshielded lane U-29…U-36; 2 sanity tests                               |
| `packages/api` (unit)        | **70 passed**, 4 skipped, 1 todo — link codec, amounts, errors, private state, the DApp Connector bridge, the unshielded lane |
| `packages/api` (integration) | **67 passed** against a live devnet in 120s — `TACITPAY_INT=1`                                                                |

Every Wave 1 row runs offline in the pure-JS runtime — including the coin circuits (`receiveShielded`, `insertCoin`, `sendShielded`), so **nothing is deferred to the integration layer**. U-17 sweeps the serialized public state after a full lifecycle and asserts the amount (in four encodings), the memo hash, the salt and both secrets are absent. U-17b pins the Variant A exposure window below, so it stays a tested limitation rather than an assumption.

The integration suite runs the same lifecycle against a real chain with real proofs and two separate wallets. Its load-bearing assertion is that the merchant's shielded NIGHT balance **increases** after withdrawal: a status flipping to `WITHDRAWN` only proves state changed, not that value moved. It repeats the privacy sweep against live indexer data, using both parties' actual secret keys read from their private-state providers.

## Repository layout

```
├── PRD.md                   product requirements — source of truth
├── docs/                    WAVE-CHANGELOG · DECISIONS · PRIVACY · ARCHITECTURE · DEMO-SCRIPT · BACKLOG
├── contracts/               tacitpay.compact · witnesses.ts · unit/simulation tests
├── packages/
│   ├── api/                 TacitPayApi — the only place circuit calls happen (PRD §8)
│   ├── ui/                  Vite + React 18 + Tailwind (PRD §9)
│   ├── cli/                 deploy + invoice lifecycle for demos/tests (PRD §10)
│   └── docs/                docs.tacitpay.xyz — whitepaper & documentation (Astro Starlight)
├── deployments/             contract addresses per network (committed once deployed)
└── config/networks.json     endpoints per network (PRD §12.2)
```

`packages/sdk` (npm `@tacitpay/node`) and `packages/mcp` arrive in Wave 2.

## Roadmap

| Wave                | Theme                   | Highlights                                                                                                                                               |
| ------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 (Aug 27 – Sep 16) | The loop works          | Contract + tests, API, CLI, UI on Preview, Variant A escrow, judge sandbox                                                                               |
| 2 (Sep 27 – Oct 17) | Developers and agents   | Milestone escrow, claim-based refunds, recurring invoices, Variant B escrow, receipt proofs, Node SDK, MCP server, tUSDM on Preview, in-app shield-funds |
| 3 (Oct 27 – Nov 16) | Prove it to the auditor | ZK revenue & receivables proofs, USDM on mainnet (stretch), mobile PoC                                                                                   |

Progress per wave: [`docs/WAVE-CHANGELOG.md`](./docs/WAVE-CHANGELOG.md).
Twelve-slide overview: [`docs/deck/index.html`](./docs/deck/index.html) — open it in a browser and present with the arrow keys.

## Known limitations

Stated openly per PRD §4.5:

- **Payment timing is correlatable** — an observer learns "some invoice was paid at time T", never the amount or the parties.
- **Anonymity sets are small on a young network** — inherent to any new chain.
- **Whoever issued the invoice learns who paid it** — off-chain, because they sent them the link. Normal commerce, not a chain leak.
- **The browser _write_ path met its first real wallet on Aug 26 2026** — Lace 4.0.1 connected, proved in-wallet and created an invoice on Preview, ledger-confirmed (see "How judges test it"). The pay leg is next; it already surfaced that **paying requires shielded tNIGHT** while faucets dispense transparent tNIGHT. The browser _read_ path was already proven (D-015).
- **Wallet-reported transaction IDs are ledger _identifiers_, not hashes** — explorers index the 64-hex transaction _hash_, so pasting the ID a wallet shows into an explorer search finds nothing. The indexer maps between the two; the success dialog deep-linking by hash is a pending fix.
- **A forgotten private-state passphrase loses invoice bodies** — the chain still proves the invoice existed and was settled; the amount, memo and salt are gone. Export/import is the Wave 2 mitigation (D-014).
- **Variant A escrow leaks while it holds the coin** — and more than value: the escrowed coin's nonce is public, so after a withdrawal an observer who guesses the merchant's Zswap key can confirm it against the withdrawal's coin commitment, linking that merchant's withdrawals in transaction history. Withdrawing does not undo it. Wave 2's Variant B escrow removes the exposure; test U-17b pins the current behaviour meanwhile.

---

Live: [tacitpay.xyz](https://tacitpay.xyz) · [app.tacitpay.xyz](https://app.tacitpay.xyz) · [docs.tacitpay.xyz](https://docs.tacitpay.xyz)
Built on [Midnight](https://midnight.network) · [Compact docs](https://docs.midnight.network) · Midnight Expert used for verified Compact generation.
Licensed under [Apache-2.0](./LICENSE).
