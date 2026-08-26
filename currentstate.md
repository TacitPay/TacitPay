# TacitPay — current state

**As of 2026-08-24, commit `6865246` plus uncommitted work.** 28 commits since
the pre-wave scaffold.

This document is the fast way to understand what exists without reading the
codebase. Every claim points at the file or command that proves it, so treat
it as a map, not as authority — **the code and the tests are the truth**. If
this document and the repository disagree, the repository is right and this
file is stale.

Related documents: [`PRD.md`](./PRD.md) is the product spec and the source of
truth for intent. [`docs/DECISIONS.md`](./docs/DECISIONS.md) records why
things are the way they are. [`docs/plans/wave-1.md`](./docs/plans/wave-1.md)
tracks execution.

---

## 1. What TacitPay is

A private invoicing and settlement protocol on the Midnight blockchain.

A merchant issues an invoice and gets paid on-chain. What reaches the public
ledger is only a **commitment** — a hash of the amount, memo and a random salt
— plus a status flag. The amount, the memo and both parties' identities stay
in private state on their own devices and are never published.

The point is holding two things at once that normally conflict: **anyone can
verify an invoice was settled**, while **nobody can see what it was for**. A
fully transparent chain gives you the first and destroys the second; a fully
anonymous one gives the second and makes the first impossible.

---

## 2. Status at a glance

Wave 1 scope is PRD §14.1. Seven of ten items are complete and independently
verified. Everything still outstanding is waiting on one thing: a funded wallet.

| #   | Scope item                                   | Status                                                 |
| --- | -------------------------------------------- | ------------------------------------------------------ |
| 1   | Contract with 4 circuits, Variant A escrow   | **Done**                                               |
| 2   | Unit tests U-01…U-17                         | **Done** (plus U-17b)                                  |
| 3   | Integration test on local devnet             | **Done**                                               |
| 4   | `packages/api`                               | **Done** — browser providers are real, not stubs       |
| 5   | `packages/cli`                               | **Done**                                               |
| 6   | `packages/ui` — six routes, works on Preview | **Built and wired**; not yet run against a real wallet |
| 7   | Deployed to Preview, address committed       | **Not started** — blocked on wallet funding            |
| 8   | README, PRIVACY, ARCHITECTURE, deck, video   | **Partial** — docs done; deck and video outstanding    |
| 9   | Repo topics, Apache-2.0, repo public         | **Partial** — topics set, licensed; **still private**  |
| 10  | Judge sandbox (`demo seed`)                  | **Done**                                               |

**The most important caveat:** item 6 no longer runs only on mock data — the
chain-backed adapter is built, wired and reachable from `/settings`. But it has
never talked to a real wallet extension, because that needs a funded wallet and
a deployed contract. Everything up to that point is verified; that last step is
not, and this document will not claim it is.

---

## 3. What exists, component by component

### 3.1 The contract — `contracts/tacitpay.compact`

Four exported circuits, compiled by compact 0.31.1 against
`@midnight-ntwrk/compact-runtime` 0.16.0.

| Circuit         | Asserts                                                             | Ever made public                          |
| --------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `createInvoice` | id unused, amount > 0                                               | invoice id, owner tag, expiry, commitment |
| `payInvoice`    | OPEN, unexpired, commitment matches preimage, coin colour and value | payer tag, status, escrowed coin          |
| `withdraw`      | PAID, caller's secret derives the stored owner tag                  | status                                    |
| `cancelInvoice` | OPEN, caller's secret derives the stored owner tag                  | status                                    |

Two design points that are easy to get wrong and worth understanding before
changing anything:

- **Ownership is proven from the witness secret, never from `ownPublicKey()`.**
  That value is supplied by the prover, so it can name a recipient but cannot
  authorise anything.
- **Tags hash a secret-derived public key, never the secret.** `persistentHash`
  is not hiding, so hashing a secret directly would leak it. `persistentCommit`
  _is_ hiding, which is why the invoice commitment can be stored without
  `disclose()`.

Escrow is **Variant A**: the contract holds the paid coin between `payInvoice`
and `withdraw`, because sending to a key other than the transaction creator
does not notify that user's wallet. Its cost is documented in §6 below.

Witness implementations: `contracts/src/witnesses.ts`.

### 3.2 The shared library — `packages/api`

The only place circuit calls happen. The UI, the CLI and (in Wave 2) the MCP
server all go through it, so there is one audited path to the chain.

| File                       | Holds                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/link.ts`              | invoice-link codec for the URL-fragment payload, strictly validated — this parses attacker-controlled input         |
| `src/state.ts`             | merchant and payer private-state records                                                                            |
| `src/api.ts`               | deploy/reconnect, circuit calls, ledger reads, status observables                                                   |
| `src/errors.ts`            | error mapping — circuit assertion strings surface verbatim; wallet and proof-server failures become actionable text |
| `src/providers/node.ts`    | the six-provider Node wiring (CLI, tests)                                                                           |
| `src/providers/browser.ts` | the browser six-provider wiring — a real DApp Connector adapter plus the three-tier proof provider (D-013)          |

### 3.3 The command-line tool — `packages/cli`

Deploy, full invoice lifecycle, `wallet dust-status`, `wallet fund-local`, and
the judge sandbox. Seeds come from `.env.<network>` and are never printed.
Commands needing the chain fail with _"Run yarn env:up, then retry"_ rather
than a connection stack trace.

`src/local.ts` holds the sandbox and funding logic; `src/main.ts` the command
dispatch.

### 3.4 The web app — `packages/ui`

Vite + React 18 + Tailwind 4 + shadcn/ui, with Iconsax icons. **Not Next.js**,
deliberately: invoice payloads live in the URL fragment so no server ever sees
them, and a server runtime would reintroduce exactly the surface the privacy
claim denies.

| Route                | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `/`                  | public marketing page — no wallet, no app chrome  |
| `/app`               | the app's front door; the three role entry points |
| `/merchant`          | dashboard, create invoice, withdraw, cancel       |
| `/pay`               | decodes the link fragment, pays                   |
| `/receipts`          | payer's receipts                                  |
| `/verify/:invoiceId` | public status page, no wallet needed              |
| `/settings`          | network, proving mode, proof-server health        |

**It runs on `src/lib/api/mock.ts` until it is pointed at a contract.** With a
contract address, a wallet and a prover all present, `/settings` unlocks the
chain-backed adapter in `src/lib/api/real.ts`, which is then installed through
the single swap point in `src/lib/api/index.tsx`. Precedence is explicit
injection, then live, then mock.

The chain code is behind a dynamic import, so a visitor to the marketing page
never downloads it: the entry chunk is **24.8 kB** and the Midnight stack is a
separate **866 kB** chunk fetched only on connect.

Two things the adapter has to reconcile, both documented in D-013 and D-014:
the library binds one instance to one role, so `real.ts` runs a merchant and a
payer instance and dispatches each method to the one that owns it; and the
five proof stages in the UI are reported by wrapping the three providers that
actually perform them, rather than by guessing at timings.

Wallet discovery (`src/lib/wallet.ts`) scans `window.midnight` and matches on
`rdns` or name — no hardcoded wallet keys — and treats every injected value as
untrusted.

### 3.5 Proving — the part users feel

Generating a proof requires the private invoice data, so whoever proves it
sees it. **TacitPay therefore never operates a prover.** `src/lib/proving.ts`
resolves three tiers, in trust order:

1. **In the wallet.** 1AM proves in-browser via WASM — no Docker, nothing
   leaves the tab. This is the seamless path.
2. **A local proof server** on `localhost:6300`. Lace requires this today.
3. **A prover the user hosts** themselves, over TLS. Settings only.

Capability is detected at runtime (`typeof api.getProvingProvider === 'function'`)
and never inferred from which wallet is connected, because wallet capabilities
are changing underneath us. The active tier is shown in the app header.

---

## 4. Tests

```
contracts        20 passed | 10 todo      offline, ~0.5s
packages/api     66 passed |  1 todo      offline, ~2s
packages/api     67 passed               against a live devnet, ~2min
```

The todos are the pre-registered Wave 2/3 rows, kept visible so progress shows
in every run.

**Nothing was deferred to the integration layer.** The coin-handling circuits
run in the pure-JS runtime, so a judge can verify the contract with no Docker,
no wallet and no network.

Two tests carry more weight than the rest:

- **U-17** (`contracts/src/test/tacitpay.test.ts`) runs a full lifecycle, then
  serialises the public ledger and asserts the amount is absent in four
  encodings, along with the memo hash, the salt and both secrets.
- **The integration test** (`packages/api/test/lifecycle.int.test.ts`) asserts
  the merchant's shielded balance **increases** after withdrawal. A status
  flipping to `WITHDRAWN` only proves state changed; the balance proves value
  moved. It repeats the privacy sweep against live indexer data using both
  parties' real secret keys.

Run them:

```bash
yarn test                                              # offline, everything
TACITPAY_INT=1 yarn workspace @tacitpay/api run test   # live devnet
```

---

## 5. Environment

```bash
yarn install && yarn compile && yarn test    # no Docker, no wallet
yarn workspace @tacitpay/ui run dev          # http://localhost:5173

git clone https://github.com/midnightntwrk/midnight-local-dev.git ../midnight-local-dev
yarn env:up        # node :9944 · indexer :8088 · proof server :6300
yarn env:status    # container state plus live endpoint probes
yarn demo:seed     # judge sandbox
yarn env:down
```

Verified versions (see D-011; **never pin these from memory**):

| Component          | Version                                                    | Note                                                           |
| ------------------ | ---------------------------------------------------------- | -------------------------------------------------------------- |
| Compact compiler   | 0.31.1                                                     |                                                                |
| compact-runtime    | 0.16.0                                                     | matches the generated artifact exactly                         |
| Midnight.js        | 4.1.1                                                      | the PRD's original 4.0.4 never existed                         |
| Wallet SDK         | `@midnightntwrk/wallet-sdk` 1.2.0                          | **scope has no hyphen** — the hyphenated one is stale at 1.1.0 |
| DApp Connector API | `@midnight-ntwrk/dapp-connector-api` 4.0.1                 | the browser wallet contract; see D-013                         |
| onchain-runtime-v3 | 3.0.0                                                      | pinned by a yarn `resolutions` entry — see D-012               |
| Devnet images      | node 1.0.0 · indexer-standalone 4.3.3 · proof-server 8.1.0 |                                                                |

---

## 6. Known limitations — state these openly

- **Variant A escrow leaks more than value.** While the contract holds a coin,
  its `QualifiedShieldedCoinInfo` is public — including the **nonce**. After a
  withdrawal, an observer who guesses the merchant's Zswap key can confirm it
  against the recomputed coin commitment, linking that merchant's withdrawals
  in transaction history. Withdrawing does not undo this. Variant B (Wave 2)
  closes it; test **U-17b** pins the current behaviour so any widening fails.
- **Invoice ids are an unauthenticated first-come namespace.** Someone holding
  a link payload could create the invoice first under their own secret. Bounded
  — the merchant's client sees the failed transaction — but deriving ids
  in-circuit is a Wave 2 candidate.
- **Escrowed funds have no exit without the merchant** until Wave 2 refunds.
  Keep Wave 1 on testnet.
- **Payment timing is correlatable.** An observer learns "some invoice was paid
  at time T", never the amount or the parties.
- **The browser wallet path has never met a real wallet extension.** Every
  provider is built against the shipped `dapp-connector-api@4.0.1` type
  definitions and unit tested, and the whole stack builds and bundles, but no
  browser wallet has driven it. The wire format is no longer part of that
  uncertainty: the hex encoding and the transaction markers were verified
  against midnight-js's own `DAppConnectorWalletAdapter`, the receiving side of
  the same interface (D-013). What remains untested is the extension itself.
- **A forgotten private-state passphrase loses invoice bodies.** The chain still
  proves an invoice existed and was settled; the amount, memo and salt are gone.
  Export/import is the Wave 2 mitigation (D-014).

---

## 7. Decisions worth knowing

Full text in [`docs/DECISIONS.md`](./docs/DECISIONS.md).

| ID    | Decision                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------ |
| D-003 | Repo is private during development — **must be public before Sep 16**                                                    |
| D-008 | No CI, by owner decision; the same gates run locally before every push                                                   |
| D-010 | Three-tier feature-detected proving; both Lace and 1AM; Docker optional. A TacitPay-hosted prover is explicitly rejected |
| D-011 | Midnight.js pinned at 4.1.1; wallet SDK from the un-hyphenated scope                                                     |
| D-012 | `onchain-runtime-v3` pinned to a single instance via `resolutions`                                                       |

**D-012 is worth reading before debugging anything odd.** Two copies of a
WASM-backed module in one process fail `instanceof` against each other, and
the symptom is a misleading `expected instance of StateValue` — nothing is
wrong with the state.

---

## 8. What is left

**Blocked on the owner — start these first, they gate everything on-chain:**

1. **Fund the two Lace Preview wallets and register for DUST.** ~12-hour lead
   time. The Preview deployment, the end-to-end run and the video all wait on it.
2. **Flip the repository public** before the Sep 16 submission (D-003).

**Engineering — all of it now needs a funded wallet:**

3. Deploy to Preview; commit `deployments/preview.json`.
4. End-to-end run with a real wallet on Preview. This also closes the Day-3
   VERIFY on whether the shipping Lace build implements `getProvingProvider`
   (its bug was closed 2026-08-07 while the docs still say it does not) — then
   update D-010.
5. Rebuild the UI with `VITE_TACITPAY_CONTRACT_PREVIEW=<address>` so the
   deployed contract is baked in rather than pasted into Settings.

**Submission materials:**

6. Deck (≤12 slides) and the 3–5 minute video.
   [`docs/DEMO-SCRIPT.md`](./docs/DEMO-SCRIPT.md) is the shot list.
7. Host the UI publicly. [`vercel.json`](./vercel.json) has the build command,
   the SPA rewrite that keeps `/verify/<id>` alive through a refresh, and the
   security headers. Run `yarn compile` first — the deploy copies the prover
   keys out of `contracts/managed/`, which is gitignored build output.

**Done since this document was first written:** the UI is connected to
`@tacitpay/api`; the browser providers are real; fonts are self-hosted, so the
app now makes no automatic third-party request at all; the marketing page is
code-split away from the app (525 kB → 24.8 kB entry); `docs/PRIVACY.md`,
`docs/ARCHITECTURE.md`, `docs/WAVE-CHANGELOG.md` and `docs/DEMO-SCRIPT.md` are
written.

---

## 9. Verifying this document

```bash
yarn compile && yarn lint && yarn typecheck && yarn test   # the full local gate
grep -c "^export circuit" contracts/tacitpay.compact       # 4
yarn env:status                                            # devnet health, if up
```

Nothing here should be taken on trust. Every number above came from running
these commands, and they should be re-run rather than believed.
