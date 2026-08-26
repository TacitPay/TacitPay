# TacitPay — current state

**As of 2026-08-24, commit `f710478`.** 69 commits since the pre-wave scaffold.

This document is the fast way to understand what exists without reading the
codebase. Every claim points at the file or command that proves it, so treat it
as a map, not as authority — **the code and the tests are the truth**. If this
document and the repository disagree, the repository is right and this file is
stale.

Related documents: [`PRD.md`](./PRD.md) is the product spec and the source of
truth for intent. [`docs/DECISIONS.md`](./docs/DECISIONS.md) records why things
are the way they are, D-001 through D-016.
[`docs/plans/wave-1.md`](./docs/plans/wave-1.md) tracks execution and holds the
Preview runbook. [`docs/PRIVACY.md`](./docs/PRIVACY.md) and
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) are the deep versions of §3 and
§6 here.

---

## 1. What TacitPay is

A private invoicing and settlement protocol on the Midnight blockchain.

One party issues an invoice, another settles it on-chain. What reaches the
public ledger is only a **commitment** — a hash of the amount, memo and a random
salt — plus a status flag and an expiry. The amount, the memo and both parties'
identities stay in private state on their own devices and are never published.

The protocol knows two roles and nothing about who fills them: freelancers,
suppliers, agencies, B2B counterparties, or — from Wave 2, through the MCP
server — software agents. The contract and the code name the issuing role
_merchant_, after the witness and the owner tag; read it as "issuer".

The point is holding two things at once that normally conflict: **anyone can
verify an invoice was settled**, while **nobody can see what it was for**. A
fully transparent chain gives you the first and destroys the second; a fully
anonymous one gives the second and makes the first impossible.

---

## 2. Status at a glance

Wave 1 scope is PRD §14.1.

| #   | Scope item                                   | Status                                                                 |
| --- | -------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Contract with 4 circuits, Variant A escrow   | **Done**                                                               |
| 2   | Unit tests U-01…U-17                         | **Done** (plus U-17b)                                                  |
| 3   | Integration test on local devnet             | **Done**                                                               |
| 4   | `packages/api`                               | **Done** — browser providers are real, not stubs                       |
| 5   | `packages/cli`                               | **Done**                                                               |
| 6   | `packages/ui` — six routes, works on Preview | **Read path done and proven; write path built but never met a wallet** |
| 7   | Deployed to Preview, address committed       | **Not started** — blocked on wallet funding                            |
| 8   | README, PRIVACY, ARCHITECTURE, deck, video   | **Docs and deck done; video outstanding**                              |
| 9   | Repo topics, Apache-2.0, repo public         | **Topics set, Apache-2.0 licensed; still private**                     |
| 10  | Judge sandbox (`demo seed`)                  | **Done**                                                               |

Six items are complete outright (1, 2, 3, 4, 5, 10). Item 6 is complete except
for one step nothing can substitute for. Items 7, 8 and 9 have exactly one
piece left each — a deployment, a video, and a visibility flip.

**Everything outstanding is gated on one thing: two funded Preview wallets.**

### The one caveat that matters

§3.6 states it precisely, but in short: the UI is no longer a mock. The
chain-backed adapter is built, wired, and its **read** path is proven against a
real chain in a real browser. Its **write** path — signing and submitting
through a wallet extension — has never been executed by anything, because that
needs a funded wallet and a deployed contract. This document will not claim
otherwise, and neither should the deck or the video.

---

## 3. What exists, component by component

### 3.1 The contract — `contracts/tacitpay.compact`

Four exported circuits, compiled by compact 0.31.1 against
`@midnight-ntwrk/compact-runtime` 0.16.0.

| Circuit         | Asserts                                                             | `disclose()`d                           |
| --------------- | ------------------------------------------------------------------- | --------------------------------------- |
| `createInvoice` | id unused, amount > 0                                               | invoice id, owner tag, expiry (3 calls) |
| `payInvoice`    | OPEN, unexpired, commitment matches preimage, coin colour and value | payer tag, status, escrowed coin (4)    |
| `withdraw`      | PAID, caller's secret derives the stored owner tag                  | status (1)                              |
| `cancelInvoice` | OPEN, caller's secret derives the stored owner tag                  | status (1)                              |

Two design points that are easy to get wrong and worth understanding before
changing anything:

- **Ownership is proven from the witness secret, never from `ownPublicKey()`.**
  That value is supplied by the prover, so it can name a recipient but cannot
  authorise anything. Getting this backwards is the bug that lets anyone
  withdraw anyone's money.
- **Tags hash a secret-derived public key, never the secret.** `persistentHash`
  is not hiding, so hashing a secret directly would leak it. `persistentCommit`
  _is_ hiding, which is why the invoice commitment can be stored without
  `disclose()` — that absence is the design working.

Escrow is **Variant A**: the contract holds the paid coin between `payInvoice`
and `withdraw`, because sending to a key other than the transaction creator does
not notify that user's wallet. Its cost is documented in §6.

Witness implementations: `contracts/src/witnesses.ts`.

### 3.2 The shared library — `packages/api`

The only place circuit calls happen. The UI, the CLI and (in Wave 2) the MCP
server all go through it, so there is one audited path to the chain.

| File                       | Holds                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/link.ts`              | invoice-link codec for the URL-fragment payload, strictly validated — this parses attacker-controlled input         |
| `src/state.ts`             | merchant and payer private-state records                                                                            |
| `src/api.ts`               | deploy/reconnect, circuit calls, ledger reads, status observables                                                   |
| `src/observer.ts`          | the **read-only** surface — status reads and the live status observable, needing only a `publicDataProvider`        |
| `src/errors.ts`            | error mapping — circuit assertion strings surface verbatim; wallet and proof-server failures become actionable text |
| `src/providers/node.ts`    | the six-provider Node wiring (CLI, tests)                                                                           |
| `src/providers/browser.ts` | the browser six-provider wiring — a real DApp Connector adapter plus the three-tier proof provider (D-013)          |
| `src/providers/public.ts`  | the single provider a public read needs; deliberately imports no private-state store (D-015)                        |

Four entry points, and the split between them is load-bearing rather than tidy:

```
@tacitpay/api           the library
@tacitpay/api/node      Node providers   — CLI, integration tests
@tacitpay/api/browser   browser providers — wallet, proving, private state
@tacitpay/api/public    one provider      — public reads, no wallet, no LevelDB
```

`/browser` imports `levelPrivateStateProvider`, which pulls LevelDB and Node's
`events` with it. Importing that to read a public status does not merely bloat a
bundle — in a browser it fails outright. A page that must work without a wallet
must not have a wallet's dependencies in its graph, and a separate entry point
is what makes that impossible to regress by accident (D-015).

### 3.3 The command-line tool — `packages/cli`

Deploy, full invoice lifecycle, `wallet dust-status`, `wallet fund-local`, and
the judge sandbox. Seeds come from `TACITPAY_SEED` or `.env.<network>` and are
never printed. Commands needing the chain fail with _"Run yarn env:up, then
retry"_ rather than a connection stack trace.

```
tacitpay deploy --network local|preview --token NIGHT|USDM|<hex>
tacitpay invoice create|pay|withdraw|cancel|status
tacitpay wallet dust-status|fund-local
tacitpay demo seed [--reset]
```

`src/local.ts` holds the sandbox and funding logic; `src/main.ts` the command
dispatch; `src/config.ts` the network and seed loading.

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
| `/settings`          | network, proving mode, contract connection        |

Plus a 404. Seven routes shipped where §14.1 asked for six — `/` was split out
so the marketing page carries no app chrome.

**How it decides what to talk to** (`src/lib/api/`):

| File            | Role                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `index.tsx`     | the swap point — explicit injection, then a live API, then the mock                              |
| `mock.ts`       | in-memory adapter; what runs until a contract address is configured                              |
| `real.ts`       | the chain-backed adapter over `@tacitpay/api`                                                    |
| `live.tsx`      | builds the observer and, on unlock, the full API; tears both down when a prerequisite disappears |
| `deployment.ts` | which contract to talk to, and the endpoint table                                                |

Two paths, with different requirements, which is the important part:

- **Public reads need only a contract address.** `/verify/<id>` builds an
  observer from `@tacitpay/api/public` as soon as one is configured — no wallet,
  no prover, no passphrase. That is what a public verification page has to mean.
- **Everything else needs a wallet, a prover and a passphrase**, and is unlocked
  deliberately from `/settings` → Contract connection. Nothing is attempted
  automatically: connecting reads private state and costs a wallet prompt.

A contract address comes from `VITE_TACITPAY_CONTRACT_{PREVIEW,LOCAL}` at build
time, or from a value pasted into Settings and stored per network — a stored one
wins, so a judge can point the app at their own local deployment.

The chain code sits behind a dynamic import, so a visitor to the marketing page
never downloads it — verified by grepping the built chunks, not assumed: neither
the Midnight stack (**486 kB / 121 kB gzip**) nor the wallet adapter
(**104 kB / 32 kB gzip**) appears anywhere in the entry graph, and the ~11.5 MB
of WASM is fetched only when a page actually reads the chain.

What a first visit does cost is **184 kB gzip of JavaScript and 12 kB gzip of
CSS**, across the entry chunk and the modules `index.html` preloads with it.
Roughly 20 kB of that is GSAP with ScrollTrigger, which the landing page needs
(D-016) and which `/app` pays for too, because `HomePage` is deliberately not
lazy. Most of the rest is app code — `AppShell`, `AppLayout`, `card`, `tooltip`,
`buffer` — dragged into the marketing entry graph by static imports in
`App.tsx`. That is pre-existing and worth revisiting; it is not urgent, and it
is not something to refactor in the week before a demo.

Two things `real.ts` has to reconcile (D-013, D-014): the library binds one
instance to one role, so it runs a merchant and a payer instance and dispatches
each method to the one that owns it; and the five proof stages are reported by
wrapping the three providers that actually perform them, rather than by guessing
at timings.

Wallet discovery (`src/lib/wallet.ts`) scans `window.midnight` and matches on
`rdns` or name — no hardcoded wallet keys — and treats every injected value as
untrusted.

**The marketing surface at `/`** (`src/components/marketing/`) is its own
thing: one chapter grammar built on the terminator — the edge of the eclipse,
where the public ledger meets private state (D-016). It opens on identity alone
against that line, then narrows into five chapters: the boundary, the route an
invoice travels, the contract that enforces it, what makes the whole thing
possible (Midnight's dual ledger, and the Cardano security it inherits), and
what stays unseeable either way. Three of those carry a live instrument built on GSAP + ScrollTrigger; each
runs only while on screen, stops with the browser tab, has a real pause control,
and is labelled illustrative. Below `xl` each one is replaced by a compact
static twin rather than a diagram the reader has to drag sideways.

Motion never owns visibility. Every tween is a `from`, so the resting state is
what the markup already says, and turning on reduced motion tears the whole
system down and leaves the page exactly as it reads with JavaScript disabled —
including the instruments, which author their _finished_ state so that visitor
gets the answer and not just the question.

**Light and dark are token-level** (`src/index.css`, `src/lib/theme.ts`). The
light palette sits on bare `:root`; the dark one is redefined under both
`@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }` and
`:root[data-theme='dark']`, so all three visitor states resolve — explicit
light, explicit dark, and the default "system", which stamps nothing at all.
Only an explicit choice is stored, so clearing it is how someone goes back to
following their OS, and `index.html` stamps it before first paint so the page
never renders light and then flips. Every surface follows the theme, splash
included — the terminator is drawn from a raw channel triple (`--tp-glow`)
rather than a colour token, because it is one colour at a dozen alphas, and it
inverts from near-black ink on paper to silver on the void.

### 3.5 Proving — the part users feel

Generating a proof requires the private invoice data, so whoever proves it sees
it. **TacitPay therefore never operates a prover.** `src/lib/proving.ts` resolves
three tiers, in trust order:

1. **In the wallet.** 1AM proves in-browser via WASM — no Docker, nothing leaves
   the tab. This is the seamless path.
2. **A local proof server** on `localhost:6300`. Lace requires this today.
3. **A prover the user hosts** themselves, over TLS. Settings only.

Capability is detected at runtime (`typeof api.getProvingProvider === 'function'`)
and never inferred from which wallet is connected, because wallet capabilities
are changing underneath us. The active tier is shown in the app header.

### 3.6 What has actually been executed, and what has not

The distinction this whole document turns on.

| Path                                               | Run against a real chain?                                       |
| -------------------------------------------------- | --------------------------------------------------------------- |
| Contract circuits, all four                        | **Yes** — pure-JS runtime, 20 offline tests                     |
| Full lifecycle via Node + CLI                      | **Yes** — live devnet, real proofs, two wallets, balance checks |
| Judge sandbox (`demo seed`)                        | **Yes** — deploys and seeds three invoices                      |
| Browser **read** — `/verify/<id>`                  | **Yes** — real contract, cold load, dev _and_ production builds |
| Browser **write** — connect, create, pay, withdraw | **No.** Built and unit-tested; no wallet extension has run it   |

Getting the browser read path working surfaced three defects that every offline
check had passed — see D-015. They are worth knowing because they are the class
of thing a green build cannot show you:

1. **The Midnight WASM never initialised under Vite.** The bundle built, both
   `.wasm` files were emitted, lint and typecheck and all tests passed, and the
   first chain read threw `Cannot access '__wbindgen_start' before initialization`.
   Fixed with `vite-plugin-wasm`.
2. **The wallet-free page dragged LevelDB in** and died with
   `Class extends value undefined`. Fixed by the `/public` entry point in §3.2.
3. **A stale response overwrote a newer one.** The mock waits 360 ms by design;
   the observer answered faster, so the mock's reply landed second and won. The
   page reported "unknown invoice" for an invoice that plainly existed, then was
   correct after any navigation. Fixed with a cancellation guard.

---

## 4. Tests

```
contracts        20 passed | 10 todo               offline, ~0.5s
packages/api     66 passed |  1 todo |  4 skipped  offline, ~2s
packages/api     67 passed                         against a live devnet, ~2min
```

The todos are pre-registered Wave 2/3 rows, kept visible so progress shows in
every run. The 4 skipped are the two integration files, which skip themselves
unless `TACITPAY_INT=1` and (for the observer) a seeded sandbox exists.

**Nothing was deferred to the integration layer.** The coin-handling circuits run
in the pure-JS runtime, so a judge can verify the contract with no Docker, no
wallet and no network.

Four tests carry more weight than the rest:

- **U-17** (`contracts/src/test/tacitpay.test.ts`) runs a full lifecycle, then
  serialises the public ledger and asserts the amount is absent in four
  encodings — along with the memo, the memo hash, the salt, both root secrets
  and **both parties' Zswap coin public keys**. That last group was added after
  an audit of `docs/PRIVACY.md` found INV-3 had no test and was holding by
  construction only.
- **U-17b** pins the Variant A exposure window, so the escrow leak stays a
  tested limitation rather than an assumption.
- **`lifecycle.int.test.ts`** asserts the merchant's shielded balance
  **increases** after withdrawal. A status flipping to `WITHDRAWN` only proves
  state changed; the balance proves value moved. It repeats the privacy sweep
  against live indexer data using both parties' real secret keys.
- **`observer.int.test.ts`** reads the three seeded sandbox invoices off a live
  chain with **no wallet constructed, no seed read, no proof server contacted
  and no private state opened**. The absence is the point: if any of those ever
  became necessary, the test would stop compiling.

Run them:

```bash
yarn test                                                # offline, everything
yarn env:up && yarn demo:seed                            # a real chain to test against
TACITPAY_INT=1 yarn workspace @tacitpay/api run test     # live devnet, full
TACITPAY_INT=1 yarn workspace @tacitpay/api run test:int # live devnet, just the two
```

---

## 5. Environment

```bash
yarn install && yarn compile && yarn test    # no Docker, no wallet
yarn workspace @tacitpay/ui run dev          # http://localhost:5173

git clone https://github.com/midnightntwrk/midnight-local-dev.git ../midnight-local-dev
yarn env:up        # node :9944 · indexer :8088 · proof server :6300
yarn env:status    # container state plus live endpoint probes
yarn demo:seed     # judge sandbox — prints a contract address and three invoice ids
yarn env:down
```

Verified versions (see D-011; **never pin these from memory**):

| Component          | Version                                                    | Note                                                                                  |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Compact compiler   | 0.31.1                                                     |                                                                                       |
| compact-runtime    | 0.16.0                                                     | matches the generated artifact exactly                                                |
| Midnight.js        | 4.1.1                                                      | the PRD's original 4.0.4 never existed                                                |
| Wallet SDK         | `@midnightntwrk/wallet-sdk` 1.2.0                          | **scope has no hyphen** — the hyphenated one is stale at 1.1.0                        |
| DApp Connector API | `@midnight-ntwrk/dapp-connector-api` 4.0.1                 | **scope IS hyphenated here** — the un-hyphenated one has no stable release. See D-013 |
| onchain-runtime-v3 | 3.0.0                                                      | pinned by a yarn `resolutions` entry — see D-012                                      |
| Devnet images      | node 1.0.0 · indexer-standalone 4.3.3 · proof-server 8.1.0 |                                                                                       |

**Two Vite settings are load-bearing and must not be removed** (D-015):
`vite-plugin-wasm`, without which the Midnight WASM never initialises at runtime
however cleanly it builds; and `build.target: 'esnext'`, because wasm-bindgen's
output uses top-level await. Do **not** add `vite-plugin-top-level-await` — it
requires Rollup and Vite 8 bundles with Rolldown, so it breaks the config.

The prover keys and ZKIR live in `contracts/managed/`, which is gitignored build
output. `yarn compile` must run before any UI build, or proving has nothing to
work with; the Vite plugin serves them in dev and copies them into `dist/`.

---

## 6. Known limitations — state these openly

- **Variant A escrow leaks more than value.** While the contract holds a coin,
  its `QualifiedShieldedCoinInfo` is public — including the **nonce**. After a
  withdrawal, an observer who guesses the merchant's Zswap key can confirm it
  against the recomputed coin commitment, linking that merchant's withdrawals in
  transaction history. Withdrawing does not undo this. Variant B (Wave 2) closes
  it; test **U-17b** pins the current behaviour so any widening fails.
- **The browser write path has never met a real wallet extension.** Every
  provider is built against the shipped `dapp-connector-api@4.0.1` type
  definitions and unit tested, but nothing has signed or submitted through a
  wallet. The wire format is _not_ part of that uncertainty — the hex encoding
  and the transaction markers were verified against midnight-js's own
  `DAppConnectorWalletAdapter`, the receiving side of the same interface
  (D-013). What remains untested is the extension itself.
- **Invoice ids are an unauthenticated first-come namespace.** Someone holding a
  link payload could create the invoice first under their own secret. Bounded —
  the merchant's client sees the failed transaction — but deriving ids
  in-circuit is a Wave 2 candidate.
- **Escrowed funds have no exit without the merchant** until Wave 2 refunds.
  Keep Wave 1 on testnet.
- **Payment timing is correlatable.** An observer learns "some invoice was paid
  at time T", never the amount or the parties.
- **A forgotten private-state passphrase loses invoice bodies.** The chain still
  proves an invoice existed and was settled; the amount, memo and salt are gone.
  Export/import is the Wave 2 mitigation (D-014).

Full who-sees-what table, and every invariant mapped to the test that enforces
it, in [`docs/PRIVACY.md`](./docs/PRIVACY.md).

---

## 7. Decisions worth knowing

Full text in [`docs/DECISIONS.md`](./docs/DECISIONS.md), D-001 through D-016.

| ID    | Decision                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D-003 | Repo is private during development — **must be public before Sep 16**                                                                      |
| D-008 | No CI, by owner decision; the same gates run locally before every push                                                                     |
| D-010 | Three-tier feature-detected proving; both Lace and 1AM; Docker optional. A TacitPay-hosted prover is explicitly rejected                   |
| D-011 | Midnight.js pinned at 4.1.1; wallet SDK from the un-hyphenated scope                                                                       |
| D-012 | `onchain-runtime-v3` pinned to a single instance via `resolutions`                                                                         |
| D-013 | Browser slots adapt the DApp Connector; hex wire format; tx id derived as `identifiers().at(-1)`; connector scope IS hyphenated            |
| D-014 | Private state encrypted with a typed passphrase, not a wallet signature — a forgotten passphrase loses invoice bodies                      |
| D-015 | Public reads are a separate wallet-free entry point; Vite needs `vite-plugin-wasm` or the WASM never initialises                           |
| D-016 | The landing is one chapter grammar on the terminator; light/dark is token-level with three states, and the splash stays near-black in both |

**Three of these will save someone a day each.** D-012: two copies of a
WASM-backed module in one process fail `instanceof` against each other, and the
symptom is a misleading `expected instance of StateValue` — nothing is wrong
with the state. D-013: the connector's package scope is the opposite of the
wallet SDK's, so applying D-011 by analogy installs a canary. D-015: a green
build proves nothing about whether WASM initialises.

---

## 8. What is left

The full step-by-step sequence, with the reasoning behind the ordering, is the
**Preview runbook** in [`docs/plans/wave-1.md`](./docs/plans/wave-1.md). In
summary:

**Owner actions — start (1) first, it gates everything else:**

1. **Fund the two Lace Preview wallets and register for DUST.** ~12-hour lead
   time. The deployment, the end-to-end run and the video all wait on it.
2. **Flip the repository public** before the Sep 16 submission (D-003).
3. **Record the 3–5 minute video.**
   [`docs/DEMO-SCRIPT.md`](./docs/DEMO-SCRIPT.md) is the shot list and the
   pre-recording checklist.

**Engineering, all of it gated on (1):**

4. Check `wallet dust-status` before deploying — holding NIGHT is not the same
   as being able to transact, and finding out at deploy time wastes the lead.
5. Deploy to Preview; commit `deployments/preview.json`; put the address in the
   README badge and on deck slide 8.
6. Run the lifecycle through the **CLI first**, so a failure is attributable to
   the chain rather than to a wallet extension.
7. Rebuild the UI with `VITE_TACITPAY_CONTRACT_PREVIEW=<address>`, then run the
   full loop through a real wallet extension. This is the one genuinely untested
   path. If it fails, the likeliest single culprit is the transaction encoding,
   isolated in one pair of functions in `packages/api/src/providers/browser.ts`
   (D-013). This step also closes the Day-3 VERIFY on whether the shipping Lace
   build implements `getProvingProvider` — update D-010 with the answer.
8. Host the UI publicly. [`vercel.json`](./vercel.json) has the build command,
   the SPA rewrite that keeps `/verify/<id>` alive through a refresh, and the
   security headers. Run `yarn compile` first.

**Already done** and needing nothing further: the contract and its tests, the
library, the CLI, the judge sandbox, the UI including its live read path, all
four documentation files, the twelve-slide deck at
[`docs/deck/index.html`](./docs/deck/index.html), self-hosted fonts, the
code-split bundle, and the Vercel configuration.

---

## 9. Verifying this document

Nothing here should be taken on trust. Every number above came from running
these, and they should be re-run rather than believed.

```bash
yarn compile && yarn lint && yarn typecheck && yarn format && yarn test  # the full local gate
grep -c "^export circuit" contracts/tacitpay.compact                     # 4
grep -c 'path="' packages/ui/src/App.tsx                                 # 8 — 7 routes + 404
grep -oE '^- \*\*D-0[0-9]{2}' docs/DECISIONS.md | wc -l                  # 15
node -e "console.log(Object.keys(require('./packages/api/package.json').exports))"
yarn env:status                                                          # devnet health, if up
```

To check the claim in §3.6 that the browser read path works — the one that
distinguishes this from a mock — start a devnet, seed it, and open the app
against the address it prints:

```bash
yarn env:up && yarn demo:seed
VITE_TACITPAY_CONTRACT_LOCAL=<printed address> yarn workspace @tacitpay/ui run dev
# then open /verify/<any printed invoice id>, switch the network selector to Local
```

The three seeded invoices should read OPEN, PAID and WITHDRAWN, with no wallet
installed and nothing signed.
