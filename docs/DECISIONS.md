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

- **D-003 (2026-08-23, closed 2026-08-29) — The repo is public at
  `TacitPay/TacitPay`.** Pre-wave development ran somewhere closed; the project
  now lives in the organisation, public and Apache-2.0, which satisfies PRD
  §2.2 (topics incl. `midnightntwrk` are set). The old personal repository has
  been deleted and nothing points at it any more.

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

- **D-017 (2026-08-24) — Momentum scroll on the marketing surface only, driven
  off GSAP's ticker.** `lenis@1.3.26` is started by `MarketingShell`, not at the
  root, so it begins and ends with `/` and never reaches the app routes: a tool
  full of forms, dropdowns and long tables should move exactly as much as the
  input device says it did. `src/lib/smoothScroll.ts` wires it the way the Lenis
  README specifies — `lenis.on('scroll', ScrollTrigger.update)`, `lenis.raf` on
  `gsap.ticker`, `lagSmoothing(0)` — so scroll position and every scrubbed
  timeline resolve once per frame instead of racing across two loops. Teardown
  restores `lagSmoothing(500, 33)`, GSAP's own defaults read out of
  `gsap-core.js` rather than remembered, because the ticker is global. Lenis
  reads `prefers-reduced-motion` itself and drops to 1:1 tracking, so there is
  no branch to write. Measured: one 400 px wheel tick eases to exactly 400 over
  ~1.2 s on a decaying curve.
  - **The trap that cost the most.** `html { scroll-behavior: smooth }` is gone
    from `index.css`, and must not come back. Nothing read it — both scroll
    calls in `App.tsx` pass an explicit behaviour — but ScrollTrigger did:
    `ScrollTrigger.js:502/549` records the property at init and restores it
    afterwards as an **inline** style, which no author rule can then override.
    Because the landing's ScrollTriggers are created by a child effect before
    `MarketingShell`'s effect adds the `lenis` class, ScrollTrigger always
    latched `smooth` and wrote it back, and the browser then re-animated its way
    toward every position Lenis wrote. A `html.lenis { scroll-behavior: auto }`
    rule looks like the fix and loses to the inline style.
  - **No anchor offset.** `Lenis.scrollTo` already subtracts the root's
    `scroll-padding-top` (`lenis.mjs:786`), so the existing `4rem` clears the
    sticky header for both scroll paths. Passing `offset: -64` as well landed
    every anchor a header-height too low — 127 px instead of 64 — which only
    showed up by measuring where the section came to rest.
  - **Cost:** roughly 8 kB gzip on the first-visit chunk.

- **D-018 (2026-08-24) — The "cannot see" chapter is a dial, not a wall.**
  `CannotSeeDial.tsx` rings the mark with a graduated bezel and a travelling
  index that passes a socket for `server`, `prover` and `keys`. Every socket is
  drawn empty, and each flash is timed off its own bearing as a fraction of one
  turn, so the flash is welded to the pointer arriving rather than staggered by
  hand. Two reasons for the change. The prose claim is _absence_ — these
  components are not guarded, they do not exist — and the previous graphic
  (probes creeping at a dashed boundary) argued the opposite, that attackers are
  held at a wall. And radial was the one register the page did not already own:
  every other instrument is a rail with something moving along it. A dot field
  behind the dial was tried and cut — there is no radius in this frame where it
  can fade out before meeting a box edge, so it always read as a rectangle of
  noise. Under reduced motion the wake is `display: none`, because a motion
  trail with nothing moving in front of it is a smear.
  - **Corrected same day — the arrival beat said the opposite thing.** The first
    version brightened a station as the index reached it. In every scanner idiom
    anyone has seen, a contact lighting up under a sweep means it was _detected_,
    so the graphic was claiming the reverse of the chapter it sits beside. The
    station now dims and shrinks under interrogation, and a `not fitted` readout
    appears beside its label — because a negative result is the one thing a
    diagram cannot state on its own, and words are the only unambiguous way to
    say it. The readouts rest at zero and rise, so switching the animation off
    leaves all three standing, which is the correct still reading and the one a
    deck slide would capture.
  - **Corrected again — the dial runs on one GSAP timeline, not on CSS.** The
    first attempt gave the index and each station its own CSS animation, held in
    step only by matching `animation-delay`. That shares a phase but not a
    clock: anything that restarts one and not the others — an HMR update in dev,
    an element being recreated — desyncs them permanently, and the readout ends
    up announcing a station the index is nowhere near. It now goes through the
    page's existing instrument contract (`ASSETS` + `connectLoop`), where a
    single timeline drives the rotation and every station cue, and each cue time
    is derived from that station's own bearing. Sync is then structural rather
    than maintained. It also inherits the contract's visibility gating, so the
    dial stops turning when it is off screen or the tab is hidden.
  - **The revolution slowed from 9s to 15s.** At 9s the index had travelled 80°
    past a station before its answer was legible, which is what made the two
    look unrelated even while they were technically in phase. At 15s an answer
    stands from roughly 3° to 45° past its station — measured, not estimated.
    A station near the end of the sweep is still answering when the loop comes
    round, so its clearing cue wraps to the top of the next pass.

- **D-019 (2026-08-24) — The splash scrub authors both of its endpoints; it must
  never sample the DOM.** Every leg of the scroll scrub in `useLandingMotion.ts`
  is a `fromTo` carrying `immediateRender: false`, and that is a correctness
  requirement rather than a preference. A plain `to` records its start values
  the first time it renders, and the load resolve directly above it holds those
  same elements at ITS `from` state at that moment. On a first visit the
  sampling happens to land after the resolve has finished, so the scrub records
  the resting state and the hero looks right — which is exactly why this passed
  every gate and every fresh-load check. On a remount it samples mid-resolve and
  records `scaleX: 0.4, opacity: 0` as the terminator's top-of-page state, so
  scrolling back up restores an invisible line and only a reload clears it.
  Reproduced deterministically: load `/`, click **See the line**, click **Launch
  app**, press Back, then scroll to the top.
  - **How it presented:** intermittently missing terminator and both line ends,
    on a page sitting at `scrollY: 0`. The tell was the measured transform —
    `scaleX 0.4` is not the scrub's end state (`0.18`), it is the resolve's
    `from`, which is what named the culprit.

- **D-020 (2026-08-24) — The terminator flash is weighted per ground.** Light
  and dark cannot share one alpha because they are not the same phenomenon: on
  the dark ground the flash is light blooming through the line and a little
  carries a long way, while on white the identical value is ink and reads as a
  smudge beside a rail that is already dark. `--tp-flash` / `--tp-flash-mid`
  carry the weighting (0.9/0.36 light, 0.5/0.16 dark), matched by eye against a
  density ladder rendered on both grounds until each read as the same event.
  The packet itself is now two layers — a soft elliptical halo plus a hairline
  core on the rail — because a single 3 px bar reads as a dash being slid along
  a line rather than as something moving through one. Cadence: the gap between
  crossings dropped to 1.1–2.6 s and each crossing takes a random `timeScale`
  between 0.82 and 1.24, so no two are the same speed. Measured at roughly one
  crossing every 4.2–5.5 s, against 5.4–7.2 s before.

- **D-021 (2026-08-25) — The splash carries two grounds, and everything on it is
  drawn as a departure from one rather than as a colour.** The hero divides at a
  vertical terminator: a light half for what the ledger shows, a dark half for
  what only you can read. Public is always the light ground and private always
  the dark one, so the mapping never lies; what turns over with the theme is
  which side each lands on, which is what makes the odd half the dark panel on
  paper and the light panel on the void.
  - **Why `mix-blend-mode: difference` rather than a masked second copy.** The
    wordmark, the promise, the terminator and both actions all cross the seam,
    so each has to read on two grounds at once. The obvious fix — a second copy
    of the hero's content in the opposite register, clipped to the far half —
    would have put two of every `data-tp-*` hook in the document, and the load
    resolve and the scrub select by attribute inside a `gsap.context`. Instead
    `.tp-split-ink` re-points the register's own tokens and composites in
    `difference`. Nothing inside the splash had to learn about the split,
    because it was already written entirely in `--tp-*`.
  - **The register values are near-complements, and that is not luck.** Light
    and dark were built as inversions of each other, so a single value lands
    within a step or two of both: `#ffffff` gives `#050505` on paper (against
    `--tp-ink` `#09090B`) and `#F6F6F4` on the void (against `#FAFAFA`);
    `#a8a8a8` gives `#525252` and `#9F9F9F` (against zinc-600 and zinc-400).
  - **The ramp is 2%, and the width is load-bearing twice.** At a third of the
    viewport, everything centred landed in a band of mid-grey where neither
    register reads — the promise went muddy and the primary pill vanished into
    it. At 6% the ramp still straddled the inner edge of both actions. At 2%
    every mark sits on a ground that has already committed, and 30 px at 1512 is
    still a soft edge rather than a cut.
  - **The seam sits at 50%** — a true half, and the axis the whole hero hangs
    off.
  - **The splash carries ONE action, and it is the single exception to the rule
    below.** A centred pill straddles the seam at every width (43.6–55.4% at
    1512), so it is the only element that cannot be drawn as a departure from
    one ground. It takes a literal mid grey with white type instead of
    `--primary`: mid grey is the only kind of colour that reads against both
    halves at once, at 4.5:1 on paper and 4.1:1 on the void while still carrying
    white type at 4.6:1. Anything nearer either end buys contrast on one half at
    exactly the cost of the other.
    - **This is why the actions sit outside the difference group**, and why the
      group moved from one wrapper around the whole hero onto the five leaves
      that still want it (field, terminator, line ends, lockup, promise). Under
      `difference` only ONE uniform tone is possible at a time, so a grey ground
      and white type cannot both hold across the seam — the ground would stay
      put and the type would flip halfway through the word.
    - The second action was a scroll cue to `#record`; the primary nav still
      links there, so the anchor did not go anywhere.
  - **Nothing else crosses the terminator, and the layout exists to keep it that
    way.** An element spanning both grounds changes colour halfway through
    itself, and a word that changes colour mid-word reads as a rendering fault
    rather than as a design. So the lockup is two equal columns split on the
    seam, the name is STACKED — "Tacit" over "Pay" — so it fits inside one of
    them, and the promise breaks at its own full stop. Measured at 1512: mark
    31.4–48.1%, name 50.9–65.1%, clauses 2.9–48.1% and 50.9–96.1%.
    - **Every attempt to cover the crossing instead of removing it failed, and
      for two distinct reasons.** A pool of the page's own ground behind the
      copy, a frosted pane, and a bowed seam all read as one-sided, because they
      were built from one half's colour and so looked like that side bleeding
      into the other. A neutral mid-grey plate fixes _that_ — grey belongs to
      neither half — but it cannot work under `difference` at all, since white
      differenced against mid-grey comes back as mid-grey; it would have forced
      the whole centre column out of the blend group. Removing the crossing costs
      nothing by comparison: the content stays in the group, and every colour
      stays a token.
    - **The mark is sized against the stacked name**, ~174px to its 179px at 1512. At its old size it read as a small badge parked beside a big word
      rather than as half of one lockup.
    - **The clauses turn out to be the public claim and the private one**, so
      each takes the ground it describes and they swap with the grounds like the
      line ends do. Pinning them would have put "Settlement anyone can verify"
      under a label reading PRIVATE STATE in one of the two themes.
    - **`direction: rtl` is the wrong tool for that swap.** Bidi moves a trailing
      full stop to the FRONT of an LTR clause inside an RTL box, and both
      sentences rendered as ".Numbers only you can read". Column order comes from
      `--tp-split-flow` and the alignment from `--tp-seam-a` / `-b` instead.
  - **Below `sm` the split is off entirely.** The arrangement above needs two
    columns wide enough to hold a mark and a name, and a phone has none. With
    the ground layer hidden the section falls back to its own `bg-tp-surface`,
    and the difference group then resolves to exactly the register the rest of
    the page uses — so the fallback needs no second set of colours.
  - **Mirroring is CSS, not React.** `theme.ts` stores the _choice_, not the
    resolved theme, so React would have had to resolve `system` itself against
    `matchMedia` — a flash on first paint and a second source of truth beside
    the media query. Four tokens do it instead (`--tp-split-rtl` / `-flow` /
    `-dir` / `-flip`), declared in the same three blocks as every other
    register. The line ends use `direction` and logical properties, so one
    property reverses the row _and_ flips the leader and tick inside each end.
  - **The grounds mirror; the lockup does not.** The line ends and the field
    treatments have to turn over — a "public ledger" label sitting on the
    private ground would simply be lying. Identity is the opposite case: the
    mark and the wordmark hold one position in every register, because the one
    thing on the page that must not move when the theme changes is what the
    product is called. Mirroring it was tried first and looked strong, but it
    put the splash mark in the opposite register from the header logo sixty
    pixels above it. Pinning it also fixes that for free: the light half is on
    the left on paper and on the right on the void, so the LEFT half is always
    the one matching `--tp-surface`, and a lockup pinned there always renders
    in the register the rest of the page is already in.
  - **The scrub animates a CSS variable, not `x`.** The line ends leave outward,
    and which way that physically is depends on the theme. `--tp-flank-x` is
    animated instead and the element's own `transform` multiplies it by
    `--tp-split-flip`, so GSAP never owns that transform and never hardcodes a
    direction at setup that would be wrong the moment anyone touched the toggle.
  - **The bottom fades over the last eighth**, revealing the section's own
    `bg-tp-surface`, so the odd half dissolves into the page instead of butting
    against the next section's ground. Taken over a quarter of the height it
    stopped reading as a falloff and started reading as fog.

- **D-020 (2026-08-26) — Preview browser payments go `receiveUnshielded`;
  shielding is platform-blocked upstream.** The `payInvoice` circuit consumes a
  shielded coin, and no path exists on Preview to obtain one: faucet and
  bridged tUSDM funds arrive unshielded, Lace refuses the crossing in its send
  flow, and the SDK's designed conversion — `WalletFacade.initSwap` with
  unshielded inputs and a shielded output — builds, signs and **proves**, then
  is rejected by the node with `1010: Invalid Transaction: Custom error: 199`
  (`EffectsCheckFailure(AllCommitmentsSubsetCheckFailure)`). Reproduced twice
  on 2026-08-26 against current Preview, through both the local and the
  hosted preview proof server, ruling the prover out.
  - The signature matches midnightntwrk/midnight-node #1206, which is closed
    administratively — "TO DO / Not started" labels, no linked fix — with the
    sister effects-check issue #1374 reportedly open. Empirically the behaviour
    stands on Preview today.
  - Consequence: PRD §16.2's risk-table mitigation stops being a contingency
    and becomes the Wave 1 road — a `receiveUnshielded` payment path for
    Preview browser payers (and unshielded tUSDM), with the shielded path kept
    intact as the flagship: it works today on the local devnet (genesis holds
    shielded funds) and lights up on Preview the moment the node accepts
    shielding mints.
  - `transferTransaction` is NOT a substitute — it sources each output from
    its own pool and correctly reports insufficient shielded funds.
  - **Correction (same evening, after a docs audit):** the official Wallet SDK
    reference documents `initSwap` as a TWO-PARTY atomic exchange ("trustless
    token exchanges between parties" — one side initiates, the counterparty
    completes with `balanceFinalizedTransaction`). Our single-sided submission
    was half of a swap with no counterparty, and a validation rejection is the
    EXPECTED outcome — so our attribution of the failure to midnight-node
    #1206 was premature (community sources making the same "initSwap is the
    shield method" assumption appear to share the misuse). The deeper finding
    stands and strengthens: the SDK's method surface contains NO self-shield
    primitive at all, the docs frame NIGHT as the unshielded token with
    shielded tokens as a separate, contract-minted category, and shielded
    native-colour coins appear obtainable only from devnet genesis. The
    conclusion is unchanged but better-founded: `receiveUnshielded` is the
    design-intended route for public-network payments, and a contract-minted
    shielded wrapper token is the design-intended way to "shield" — a Wave 2
    candidate.
  - **Amended 2026-08-29, after Midnight core engineering replied:** the
    single-wallet `initSwap` (unshielded in, shielded out) IS an intended
    path, and our failure matches a known Wallet SDK gap: mixed-pool swaps
    were broken on Preview through `@midnight-ntwrk/wallet-sdk` 1.2.0 (the
    SDK builds only the unshielded leg and silently drops the shielded
    output; servicedesk #99, midnight-wallet #554). The fix is merged in
    midnight-wallet PR #615 (Aug 18, 2026) and awaits a stable release;
    `1.2.1-canary.*` (Aug 21) may already carry it. Two attributions above
    are therefore wrong: the rejection was a bug, not "expected behaviour,"
    and node #1206 is unrelated (a node-toolkit contract-minting bug).
    Error-code note from the same reply: `Custom error: 199` is
    `InvariantViolation`; `AllCommitmentsSubsetCheckFailure` is 213 on node
    2.0+, so the decoding of 199 above was mistaken. The Wave 1 conclusion
    holds: no supported end-user shield path exists on Preview today (Lace
    has no shield UI; the SDK path is broken on stable), so the unshielded
    lane stays. What changes is Wave 2: native shielding through the fixed
    SDK becomes the route for programmatic wallets (CLI, SDK, MCP, the
    devnet demo), while the contract-minted wrapper remains the route for
    browser wallets, which reach TacitPay only through the DApp Connector.
    Also confirmed: Preprod endpoints are current; a 40 to 60 minute first
    sync is a known pain (midnight-wallet #405), not a stale endpoint;
    `testnet-02` is retired. A repro files under midnightntwrk/servicedesk,
    parent #99, with SDK versions, network id, commit SHA, script, tx
    hashes and the raw rejection JSON.

- **D-022 (2026-08-26) — Preview settles in bridged USDM through the new
  unshielded lane; sponsored DUST is adopted as the Wave 2 fee story; the
  compiler holds at 0.31.1.** Three linked calls made the night the unshielded
  lane was built:
  - **Token: USDM, not tNIGHT.** Invoices should be denominated in a
    stablecoin (PRD product intent from day one). USDM (Moneta Digital)
    reaches Midnight Preview over VIA Labs' lock-and-mint bridge
    (`@via-labs-tech/usdm-bridge`, PRD §16.2 has the live-verified
    parameters) as unshielded token type
    `003bacd9a361ba0d425e408776020e40271375e8b8de42d73eec046a44947d73`,
    6 decimals. The bridge mints to unshielded recipients ONLY (its own type
    declaration: "Destination Midnight unshielded address") — verified in the
    published package source, consistent with the faucet ("rejects shielded
    addresses") and with D-020's no-self-shield finding. So the unshielded
    lane is not a compromise bolted onto USDM; it is the only lane USDM can
    use today, and the lane the network's on-ramps are built for.
  - **Contract design.** Two new circuits mirror the shielded pair:
    `payInvoiceUnshielded` (same commitment checks, then
    `receiveUnshielded(paymentToken, amount)`) and
    `withdrawUnshielded(invoiceId, to: UserAddress)` (same witness-secret
    authorization, then `sendUnshielded`). A public `unshieldedOwed` map is
    the pool marker — an id present there was paid from the public pool, an
    id in `escrow` from the shielded pool — and each withdraw circuit asserts
    its own marker so funds can never exit through the wrong pool. Disclosure
    is honest by construction: an unshielded payment's amount and addresses
    are public on the ledger anyway (the envelope stays sealed; the cash is
    visible — PRD §4.5), while memo and party tags stay committed.
  - **Sponsored DUST = Wave 2, documented now.** The official
    `guides/dust-sponsorship.md` pattern (user proves + balances value and
    binds first; sponsor adds a `['dust']`-only fee offer and submits) gives
    payers a gasless first click. It covers FEES only — it is not a shielding
    mechanism and does not move value — and it needs an always-on sponsor
    wallet service, which the current static deployment cannot host. Adopted
    as the Wave 2 onboarding feature (see BACKLOG); named in the pitch as the
    web²-feel roadmap line. Reference implementation:
    `midnightntwrk/example-private-party` (`SPONSORSHIP.md`).
  - **Compiler stays 0.31.1 for Wave 1.** The official support matrix pins
    Compact toolchain 0.31.1 for every listed environment; 0.34.0 shipped
    2026-08-25 (one day old), its breaking changes (secp256k1 types, Opaque
    runtime checks, stdlib `add`/`mul` removal) touch nothing in
    `tacitpay.compact`, and a probe compile proved 0.31.1 already ships the
    full unshielded stdlib (`receiveUnshielded`, `sendUnshielded`,
    `UserAddress`, balance comparators). Upgrading mid-wave buys nothing and
    un-pins us from the tested matrix. Revisit after Wave 1.
  - Noticed, not fixed: the log numbers D-020 and D-021 each exist twice
    (splash-era 08-24/25 entries vs the payments D-020 above). References
    elsewhere use the payments meaning; renumbering history would break
    them, so the collision stays documented here instead.

- **D-023 (2026-08-27) — The passphrase never touches browser storage.** The
  refresh-survival work initially kept the private-state passphrase in
  sessionStorage so a reload could restore the whole live session. Automated
  security review flagged it and the flag is correct: browsers persist
  sessionStorage to disk for tab restore, so the plaintext key to a privacy
  product's private records would land exactly where it must not. Decision:
  the WALLET identity may persist (it is just an extension name, and Lace
  re-authorizes silently), so a reload reconnects the wallet on its own — but
  the passphrase lives in memory only, and unlocking private state always
  costs one fresh prompt. The reload dance shrinks from three steps to one,
  deliberately not zero. A sealed-token unlock (WebCrypto non-extractable key
  guarding an encrypted session token, per the reviewer's suggestion) is the
  Wave 2 way to remove the last step without storing a secret.

- **D-024 (2026-08-29) — The canary shielding spike waits for Wave 2; Wave 1
  stays frozen for the recording.** Midnight core engineering's answer (see
  D-020's amendment) makes a retest of the archived `initSwap` spike against
  `@midnightntwrk/wallet-sdk@1.2.1-canary.20260821172758-6e1050e` worthwhile:
  a passing run would prove native shielding on a public network before the
  stable release, and the control run on 1.2.0 would re-capture the raw
  rejection JSON and tx hashes the servicedesk #99 filing needs. The owner's
  decision: not now. The week belongs to rehearsing and recording; the spike
  spends Preview funds and attention for no Wave 1 gain, because browser
  wallets could not use the result anyway (they reach TacitPay only through
  the DApp Connector) and the app's pinned SDK must not move before
  submission. The spike opens Wave 2 as PRD §15.12's first step, in an
  isolated workspace, never inside the app's dependency tree. The video says
  one true sentence about it (the limitation beat in
  `docs/DEMO-TALK-TRACK.md`) and no more; the detail lives here and in
  `docs/AUDIT-RESPONSE.md` for judges who dig.

- **D-025 (2026-08-30) — Redeploy the same contract inside the wave.** The
  Wave 1 build period is Aug 27 to Sep 16; the first Preview deployment was
  Aug 26, one day early, three hours after the kickoff workshop. Nothing in
  the rubric scores deployment dates, but an explorer timestamp before the
  wave invites the wrong question. The same compiled artifacts (compact
  0.31.1, six circuits) were deployed again on Aug 30 as
  `241b760e380f86be5ed049e82ce2839decd199bd0c3b2427d77acd2d512a2df0`, and
  every live reference moved with it. Costs accepted: the new contract has no
  history until the recording rehearsal, and the Aug 26 and Aug 27 proofs
  now cite the earlier deployment explicitly. Not a new version of anything:
  one contract, one live instance, one earlier instance kept as evidence.
  Amended 2026-09-02: redeployed once more before the recording, as
  `80b4d9af1591239cb925c8145e054545605fe5f41c71d583af6ff48bebb59c59`
  (deploy tx `00bdea6f…19e6`, 11:21 GMT+8). A stalled take had left an OPEN
  invoice in the merchant's records, and private state is scoped per
  contract, so a fresh instance restarts every wallet at zero. Same
  artifacts, same reasoning, same costs accepted; the Aug 30 instance
  `241b760e…2a2df0` joins the earlier one as on-chain history.
