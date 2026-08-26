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
  - **The connector scope is the HYPHENATED one, and D-011's lesson does not
    generalise.** Both `@midnight-ntwrk/dapp-connector-api` and
    `@midnightntwrk/dapp-connector-api` exist and were published minutes apart.
    For the _wallet SDK_, D-011 concluded the un-hyphenated scope is the live
    one. For the _connector_ it is the reverse: the hyphenated package is
    `4.0.1` stable — the version PRD §8.3 names — while the un-hyphenated
    package has **no stable release at all**, only `4.1.0-beta` and a long tail
    of canaries, with its `latest` tag pointing at one of them. Applying D-011's
    rule by analogy would silently install a canary.
    This is easy to do by accident, because midnight-js's own testkit adapter —
    the file this decision cites as the reference implementation — imports the
    un-hyphenated scope. Verified 2026-08-24 with `npm view <pkg> dist-tags`;
    re-check rather than trust either scope from memory.

  - **`ttl` is dropped deliberately.** The connector takes no such argument; the
    wallet owns the time-to-live of the inputs it selects.
  - **`hintUsage` is called up front** with the exact method list TacitPay uses,
    so a wallet can gather every permission in one prompt instead of
    interrupting mid-payment. A wallet that does not implement it still works.

- **D-014 (2026-08-24) — on-device private state is encrypted with a passphrase
  the user types, not with anything derived from the wallet.**
  - `levelPrivateStateProvider` requires a `privateStoragePasswordProvider`;
    encryption is not optional, which is correct for a store holding invoice
    amounts, memos and salts.
  - **The tempting alternative was rejected.** Deriving the key by asking the
    wallet to `signData` a fixed domain string would remove the passphrase
    entirely and bind the state to the wallet. It is only safe if that signature
    is deterministic, and nothing in the connector contract promises it. A
    randomised signature would silently produce a new key every session and
    render the private state permanently unreadable — a data-loss bug that would
    not appear until someone had real invoices. Revisit only with a signature
    scheme verified deterministic in writing.
  - The passphrase is stretched once per session with PBKDF2-SHA256 at 210,000
    iterations, salted with the account id, and only the derived value is
    retained. It is never stored and never transmitted.
  - **Consequence to state plainly:** a forgotten passphrase means lost invoice
    bodies. The chain still proves an invoice existed and was settled; the
    amount, memo and salt are gone. Private-state export/import (PRD §9,
    `PrivateStateExport`) is the mitigation and is Wave 2.

- **D-015 (2026-08-24) — the public read path is a separate entry point with no
  wallet, no private state and no LevelDB in its dependency graph, and the Vite
  build needs an explicit WASM plugin.**
  Both halves were found by actually running the app against a live devnet in a
  browser. Neither was visible from a green build.
  - **`/verify/<id>` must work for someone who has never installed a wallet.**
    That is the whole point of a public verification page — a third party
    confirms settlement without being a participant. Reading a status needs only
    `publicDataProvider`, so `packages/api/src/observer.ts` holds that logic and
    `TacitPayApi` delegates to it rather than duplicating it.
  - **The separation is enforced by a separate export, `@tacitpay/api/public`,
    because a shared import silently broke it.** `providers/browser.ts` imports
    `levelPrivateStateProvider` at module scope, which pulls LevelDB and Node's
    `events` with it. Importing that entry to read a public status did not merely
    bloat the bundle — in a browser it threw
    `Class extends value undefined is not a constructor or null`, because Vite
    externalises `events` and the Level classes extend `EventEmitter`. A page
    that must work without a wallet must not have a wallet's dependencies in its
    graph, and only a separate entry point makes that impossible to regress.
  - **`vite-plugin-wasm` is mandatory, and its absence is invisible until
    runtime.** The Midnight runtime and ledger ship wasm-bindgen's bundler
    target, whose entry is
    `import * as wasm from "./…_bg.wasm"; wasm.__wbindgen_start()` — WebAssembly
    ESM integration, which Vite does not implement. Without the plugin the
    bundle builds, both `.wasm` files are emitted, lint and typecheck and every
    test pass, and the first chain read throws
    `Cannot access '__wbindgen_start' before initialization`. Treat a green
    build as evidence of nothing where WASM is concerned.
  - **`vite-plugin-top-level-await` must NOT be added alongside it**, which is
    the advice most guides give. It requires Rollup; Vite 8 bundles with
    Rolldown, so installing it fails the config outright with
    `Cannot find module 'rollup'`. It exists for targets without native
    top-level await, so `build.target` is pinned to `esnext` instead — lowering
    that target silently reintroduces the wasm-bindgen failure.
  - **Verified, not assumed:** the three seeded sandbox invoices read OPEN, PAID
    and WITHDRAWN from a real chain in a browser, on a cold load, in both the
    dev server and the production build, with no wallet extension involved.
    `packages/api/test/observer.int.test.ts` pins the same path headlessly.

- **D-016 (2026-08-24) — the marketing page at `/` is one chapter grammar built
  on a terminator, and the whole interface carries a light and a dark register
  driven by tokens rather than by a class on `<body>`.**
  The old landing was a conventional two-column hero followed by stacked
  sections. It read as a brochure, not as a protocol.
  - **The first viewport is identity alone.** One optically centred lockup on
    the terminator — the edge of the eclipse, where the public ledger meets
    private state — with no cards, no telemetry and no claims. The product
    interface starts after the first scroll. The line is annotated at both ends
    with the real field names — `status · commitment` on the public side,
    `amount · memo · parties` on the private one — matching the mark's own
    geometry (solid disc left, shielded ring right) and EclipseMark's own
    callouts. An earlier version put a fake ledger tape and fake redaction bars
    out there instead; it read as decoration pretending to be data, told the
    visitor nothing, and was cut. Both ends are hidden below `xl`.
  - **The splash follows the theme like every other surface.** It was pinned
    near-black at first, on the reasoning that an eclipse needs a dark ground.
    That was wrong in practice: it left light mode opening on a black screen,
    which reads as a bug rather than as a choice. The terminator is therefore
    drawn from `--tp-glow`, a raw channel triple rather than a colour token,
    because it is one colour at a dozen alphas — near-black ink on paper, silver
    on the void. Nothing in the header straddles two grounds any more, so the
    tone tracking it needed is gone.
  - **The mark is painted ring-first, disc over it, everywhere.** `Logo.tsx`
    always had it right and says so in its comments — the shielded ring is a
    _background_ line. `SplashLockup` and `EclipseMark` both drew the ring last,
    which lays its stroke across the face of the public disc, so the display
    mark quietly disagreed with the header logo at every size.
  - **Motion is enhancement and never owns visibility.** Every tween is a
    `from`, so the resting state is what the markup already says. Turning on
    reduced motion tears the whole system down and leaves the page exactly as it
    reads without JavaScript — which is why the instruments author their
    _finished_ state (route complete, chain column populated) and the timelines
    dim them back down to start a run. Authoring `opacity="0"` on a landed value
    would have left that visitor the instrument's question and none of its
    answer.
  - **Three instruments, three registers.** The disclosure corridor and the
    invoice route are open tape — straight rules, values attached to the track.
    The circuit interlock is the only rounded panel on the page, and its gates
    are the mark itself: a disc and a ring that close into an eclipse when a
    check passes. Every fourth run the expiry gate holds and the invoice takes
    `cancelInvoice`, because a cancelled invoice is an outcome the contract
    supports rather than a failure of it. Each loop runs only while on screen,
    stops with the browser tab, carries a real pause control, and is labelled
    illustrative. Stages carry ordinals, never timings: nothing here is measured.
  - **The `Built on` chapter names the enabling property, not the stack.** The
    versions this runs on belong in the repository, not on a landing page. What
    that chapter carries is the one capability TacitPay is built out of — a
    chain holding a public ledger beside a private state, able to prove one to
    the other — and where its security comes from. The Cardano relationship is
    quoted from Midnight's own docs rather than paraphrased from memory:
    Midnight is Cardano's _first partner chain_, inheriting its security and
    firewalled from it. Both docs pages are linked from the chapter so the
    claims are checkable.
  - **Vendor brand marks are vendored, unaltered, and served from this origin.**
    `public/brand/` holds the Midnight and Cardano lockups in both inks, and CSS
    picks the one that suits the ground. Hotlinking them would have made the
    visitor's browser announce the visit to two more hosts — the same reason the
    fonts are self-hosted. Midnight's CDN refuses scripted clients, so its
    dark-ground file is the official light-ground file with only the ink
    swapped, which is exactly the difference between the vendor's own two
    variants.
  - **Wide instruments get a compact static twin, not a horizontal drag.** Below
    `xl` the corridor would show only its own setup — the chain column, which is
    the entire point, would sit off the edge of a phone — so small screens get
    the conclusion as a list instead.
  - **Both registers are token-level.** `index.css` defines the light palette on
    bare `:root`, redefines it under
    `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }`,
    and again under `:root[data-theme='dark']`, so the visitor's three states —
    explicit light, explicit dark, and the default "system", which stamps
    nothing — all resolve. The two dark blocks are identical on purpose. A small
    `--tp-*` set sits on top for the marketing surface; sections and SVG
    instruments name those tokens rather than a zinc step that only works in one
    register. `src/lib/theme.ts` stores only an explicit choice, so clearing it
    is how the visitor goes back to following the OS, and `index.html` stamps
    that choice before first paint so the page never renders light and flips.
  - **Two defects this surfaced, both invisible to the gate.** `Logo` defaulted
    `badge` to `'Preview'`, so omitting the prop stamped a network name on the
    mark; and `useTheme`'s cycle closed over the _rendered_ theme, so a click
    landing before React re-rendered advanced from a stale value and appeared to
    do nothing. It now reads the store.
  - **Cost:** GSAP with ScrollTrigger adds roughly 20 kB gzip to the first-visit
    chunk. `HomePage` is deliberately not lazy — `/` is the surface a stranger
    hits first — so `/app` pays it too; the chain, wallet and proving code stays
    split behind the lazy routes.
  - **Prior art:** the chapter grammar, the visibility-gated loop contract, and
    the scrub that compresses the hero into the system are adapted from the
    txBet landing page. The geometry is not: txBet's furniture is a vertical
    gate because its thesis is a timing window; TacitPay's is a horizontal
    terminator because its thesis is a boundary.
