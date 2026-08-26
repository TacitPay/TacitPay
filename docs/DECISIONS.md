# Decisions log

ADR-style log, including the outcome of every **VERIFY** item from the PRD
(PRD rule 0.10: if docs/compiler contradict the PRD, docs/compiler win — record
the discrepancy here).

Format: `D-nnn (date) — decision. Rationale. Evidence/links.`

---

- **D-001 (2026-08-23) — Scaffold contains Wave 1 packages only** (`contracts`,
  `packages/api`, `packages/ui`, `packages/cli`). `packages/sdk` and
  `packages/mcp` are created in Wave 2, matching PRD §13's wave annotations and
  the AKINDO requirement that each wave shows meaningful new progress.

- **D-002 (2026-08-23) — `contracts/managed/` is gitignored for now.** PRD §13
  says decide on Day 2, after the first real compile, whether `keys/`/`zkir/`
  fit under 100 MB and should be committed for judges. Revisit then and update
  this entry.

- **D-003 (2026-08-23) — Repo starts private** (`Marcussy34/tacitpay`) during
  pre-wave development. **It must be flipped public before the Wave 1
  submission** (PRD §2.2 requires a public repo; topics incl. `midnightntwrk`
  are already set).

- **D-004 (2026-08-23) — Contract pragma is `pragma language_version >= 0.23;`**
  (range form, current tooling guidance) rather than the PRD's exact-version
  form. Verified: placeholder contract compiles under compact compiler 0.31.1
  locally. Re-check against the support matrix at each wave start (PRD rule 0.4).

- **D-005 (2026-08-23) — Toolchain versions pinned from the npm registry on
  2026-08-23:** TypeScript 5.9.3 (not 7.x — typescript-eslint peer range caps at
  `<6.1.0` and the Midnight ecosystem targets 5.x), ESLint 10.9.0 +
  typescript-eslint 8.67.0 (peer-compatible), Vite 8.2.2 + @vitejs/plugin-react
  6.1.0 + Vitest 4.1.11 (peer-aligned), React 18.3.1 (PRD §9 mandates React 18),
  Tailwind 4.3.3, Yarn 4.18.0 via corepack. `@midnight-ntwrk/*` packages are
  deliberately NOT added yet — they get pinned from the support matrix when the
  real contract/api work starts (PRD rule 0.4).

- **D-006 (2026-08-23) — Indexer WebSocket URLs for preview/preprod/mainnet in
  `config/networks.json` use the `wss://…/api/v4/graphql/ws` pattern by analogy
  with the documented local URL.** The PRD flags this as a VERIFY item (§12.2):
  confirm against the networks-and-environments docs before first use in code.

- **D-007 (2026-08-23, superseded by D-008) — CI installs Compact via the
  official installer** from the docs installation page
  (`curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh`
  then `compact update`). Verified working: the first (and only) CI run passed
  on ubuntu-latest before CI was removed.

- **D-008 (2026-08-23) — No CI at all** (owner decision; supersedes D-007).
  `.github/workflows/ci.yml` removed. The same gates run locally before each
  push: `yarn compile && yarn lint && yarn typecheck && yarn test`. PRD §11.5
  updated in v1.2 to reflect this.

- **D-009 (2026-08-23) — PRD v1.2 scope additions, approved by owner:**
  milestone escrow (§15.5 — payer-gated release; rides the Variant B rework),
  claim-based refunds (§15.6 — claim pattern needs no payer key), recurring
  invoices (§15.7 — client-side derivation, zero new circuits), receivables
  proofs (§16.4 — reuses the §6.8 machinery), and the Wave 1 judge sandbox.
  Rationale: each deepens the contract-centric 55% of the rubric or the judge
  experience without adding a new subsystem. Everything else surveyed went to
  `docs/BACKLOG.md`; oracle conversion, custodial checkout and an in-app
  assistant were rejected as conflicts with §1.1 principles.

- **D-010 (2026-08-24) — Proving is feature-detected across three tiers; both
  Lace and 1AM are supported; Docker is optional, not required** (owner
  decision). Tiers, in trust order: (1) wallet-provided proving via
  `getProvingProvider()` — 1AM proves in-browser in WASM, so no Docker and no
  separate process; (2) local proof server on `localhost:6300`; (3) a remote
  prover **the user controls**, over TLS, settings-only.
  **Rejected: a TacitPay-hosted proof server.** Rationale: proving needs the
  private witness, so a prover we operated would see every amount and
  counterparty — that is the trusted intermediary the product exists to remove
  (§1.1, §4.1). It would not leak to the public chain, but it would make our
  central privacy claim untrue, and "we cannot see your invoices" is only
  defensible when it is structural rather than a promise. In-browser proving
  gives the same zero-install convenience with none of that cost, so no tradeoff
  is required.
  Evidence: https://docs.midnight.network/guides/run-proof-server permits only a
  local prover or "one on a remote machine that you control, over an encrypted
  channel"; the community-wallets pages document 1AM's in-browser WASM prover
  (Halo2/BLS12-381) and state that Lace requires a local proof server and does
  not implement `getProvingProvider()`.
  **Open (VERIFY Day 3, PRD §8.3):** input-output-hk/lace issue #2224 was closed
  as completed on 2026-08-07 with a fix promised in the next Lace release, while
  the docs (accurate as of June 2026) still say Lace lacks the method. Test the
  installed extension and update this entry — the answer decides whether Lace
  users still need Docker.

- **D-011 (2026-08-24) — Midnight.js pinned at 4.1.1, and the Wallet SDK comes
  from the un-hyphenated `@midnightntwrk` scope.** Supersedes the PRD §12.1 row
  that said Midnight.js 4.0.4. Verified directly against the npm registry
  (rule 0.10 — the registry wins over the PRD):
  - `@midnight-ntwrk/midnight-js-protocol` has **no 4.0.x line at all**; its
    published versions start at `4.1.0`. The PRD's `4.0.4` was never installable.
  - Even if it had been, `midnight-js-contracts@4.0.4` targets compact-runtime
    `0.15.0`, and the generated contract requires `0.16.0` — so the 4.0.x stack
    was incompatible with our own contract regardless.
  - **Two wallet-sdk scopes exist and have diverged:** `@midnightntwrk/wallet-sdk`
    (no hyphen) is `1.2.0` and is what the official support matrix names;
    `@midnight-ntwrk/wallet-sdk` (hyphenated, matching every other Midnight
    package) is stuck at `1.1.0`. We use the **no-hyphen** scope for the wallet
    SDK and the hyphenated scope for everything else. Easy to "correct" by
    mistake — don't.
  - `@midnight-ntwrk/onchain-runtime-v3` floats to `3.1.0` via compact-runtime
    and works at the unit layer; deliberately **not pinned** at the time. An
    early research pass wrongly reported 3.1.0 as broken; that came from
    hand-rolled coin encodings in a probe, not from compiler-generated code.
    **Superseded by D-012** once Midnight.js entered the same process.

- **D-012 (2026-08-24) — `onchain-runtime-v3` is pinned to `3.0.0` by a yarn
  `resolutions` entry, so exactly one WASM instance exists per process.**
  Amends the D-011 sub-decision above.
  - **Symptom:** the first live integration run failed with
    `expected instance of StateValue`, which is misleading — the state was
    fine. compact-runtime 0.16 accepts `^3.0.0` and yarn floated it to
    `3.1.0`, while Midnight.js 4.1.1 nests an exact `3.0.0`. Two copies of a
    WASM-backed module then coexist and their classes fail `instanceof`
    against each other despite being structurally identical.
  - **Why it did not show earlier:** the unit layer loads only
    compact-runtime, so there is no second instance to clash with. Thirty
    contract tests passed precisely because Midnight.js was absent. The
    conflict is an integration-layer property, which is a good argument for
    the integration layer existing at all.
  - **Why a resolution rather than a runtime hook:** the first fix was a
    `registerHooks` resolver forcing the nested copy. It worked, but only
    where a caller remembered to install it before the first import — every
    future consumer (Wave 2's SDK and MCP server) was one forgotten line from
    rediscovering the same failure. A lockfile entry cannot be forgotten, and
    `yarn install` verifiably yields a single copy.
  - **Verified** with the shim deleted, not bypassed: 60 integration tests
    green against the live devnet, offline suites unchanged, sandbox seeding
    working.

- **D-013 (2026-08-24) — the browser wallet and Midnight provider slots are an
  adapter over the DApp Connector, not a second implementation.**
  `packages/api/src/providers/browser.ts`. Verified against the shipped type
  definitions of `@midnight-ntwrk/dapp-connector-api@4.0.1`, not from docs.
  - **The two interfaces do not line up, and the gaps are the whole design.**
    Midnight.js wants `balanceTx(tx: UnboundTransaction) => FinalizedTransaction`
    and `submitTx(tx) => TransactionId`. The connector offers
    `balanceUnsealedTransaction(tx: string) => {tx: string}` and
    `submitTransaction(tx: string) => void`. So: transactions cross as strings,
    and submission returns nothing at all.
  - **The transaction id is derived locally, and it must be a _watchable_ one.**
    `midnight-js-contracts` feeds whatever `submitTx` returns straight into
    `publicDataProvider.watchForTxData`. `Transaction.transactionHash()` is
    explicitly documented as unusable for that, because merging changes it;
    `identifiers()` is the watchable set. We return `identifiers().at(-1)`,
    which is exactly what the official `WalletFacade.submitTransaction` returns
    (`wallet-sdk-facade/dist/index.js:322`) — a mirror, not a guess. Submission
    is refused outright if the balanced transaction carries no identifier,
    rather than submitting something the caller could never watch for.
  - **Bech32m keys are normalised with the library's own helpers.**
    `getShieldedAddresses()` returns Bech32m; `WalletProvider` wants hex.
    `parseCoinPublicKeyToHex` / `parseEncPublicKeyToHex` in
    `@midnight-ntwrk/midnight-js-utils` exist for precisely this and pass hex
    through unchanged, so the adapter stays correct if a wallet ever reports raw
    hex instead.
  - **The wire encoding is hex, and this was verified rather than assumed.**
    `@midnight-ntwrk/dapp-connector-api` types the parameter only as
    `tx: string`. The receiving side of that same interface is implemented in
    midnight-js itself —
    `testkit-js/src/wallet/dapp-connector-wallet-adapter.ts` — and it settles
    all three directions:
    `balanceUnsealedTransaction` does
    `LedgerTransaction.deserialize('signature', 'proof', 'pre-binding', fromHex(tx))`;
    it returns `{ tx: toHex(finalized.serialize()) }`; and `submitTransaction`
    does `LedgerTransaction.deserialize('signature', 'proof', 'binding', fromHex(tx))`.
    So the markers TacitPay uses in both directions match the reference
    implementation exactly. Both conversions still go through a single pair of
    functions in `browser.ts`, so the encoding stays stated in one place.
    (`@midnightntwrk/dapp-connector-api@4.0.1`'s own mock names the parameter
    `hexTx`, and 1AM's published typings label the methods "hex-based".)
  - **`ttl` is dropped deliberately.** The connector takes no such argument; the
    wallet owns the time-to-live of the inputs it selects.
  - **`hintUsage` is called up front** with the exact method list TacitPay uses,
    so a wallet can gather every permission in one prompt instead of
    interrupting mid-payment. A wallet that does not implement it still works.
