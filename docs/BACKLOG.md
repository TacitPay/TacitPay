# Backlog

Scope-creep parking lot (PRD §18): anything not in PRD §14 for the **current
wave** goes here instead of into the codebase.

Parked deliberately on 2026-08-23 (see docs/DECISIONS.md D-009) — revisit at
wave planning, not mid-wave:

- Multi-payer / donation / campaign invoices (partial payments interact hard
  with the commitment scheme — needs its own privacy design).
- Merchant notification surface for closed-dashboard payments (public-state-only
  relay + messaging bot; §15.3 is the hook).
- Gift instruments (shielded bearer credit).
- Merchant analytics view (earnings timeline, search — client-side over private
  state).
- Payer-side batch pay (merchant-side multi-withdraw is already in §14.3).
- Encrypted cross-device private-state backup (manual export/import ships in
  `/settings` first; README must warn about device loss).
- Docs site / vision page beyond the README.
- Rejected outright (conflict with §1.1 principles): oracle token conversion,
  wallet-free custodial checkout, in-app AI assistant.

Added 2026-08-26, from the first real-wallet session (see WAVE-CHANGELOG field
notes). Wave 1 items are marked; the rest is Wave 2 planning input:

- **[Wave 1 — DECIDED 2026-08-26, see D-020 + correction and D-022] Preview
  pay leg goes `receiveUnshielded`, denominated in bridged USDM.** The
  `initSwap` spike falsified road (a) for the right reason: the official docs
  make `initSwap` a TWO-PARTY exchange, so the single-sided "shielding swap"
  was invalid by design (the 199 rejection is expected behaviour, not
  midnight-node #1206 — see D-020's correction). No self-shield primitive
  exists on public networks; every on-ramp (faucet, USDM bridge) lands
  unshielded. Build status: unshielded lane per D-022 — two mirror circuits
  plus an `unshieldedOwed` pool marker; the shielded path stays the
  local-devnet flagship.
- **[Falsified road — kept as archive] `tacitpay wallet shield`** — the swap
  wrapper (session archive: swap-shield-final.mjs) was half of a two-party
  exchange and can never land alone; it documents the dead end. Shielding
  arrives in Wave 2 as a contract-minted wrapper token (D-020 correction),
  not through a node fix.
- **[Wave 2] In-app "Shield funds"** — mint a contract-issued shielded
  wrapper token against unshielded deposits (the design-intended way to
  shield), driven through the dApp connector from the pay page. No wallet
  ships this today; TacitPay doing it is a differentiator.
- **[Wave 2] Per-invoice settlement choice** — the merchant picks Public or
  Private settlement at creation; the invoice commitment carries the required
  lane and the pay circuit enforces it (UI-only flags would be privacy
  theater). Depends on the wrapper above so "Private" is actually payable on
  public networks. Open design question: merchant _requires_ a lane vs sets a
  floor the payer may upgrade — the unshielded transfer mostly exposes the
  payer. The Wave 1 create dialog already shows the pair, active side driven
  by the network's real lane, the other greyed under a "Coming in Wave 2" tag
  (added 2026-08-28).
- **[Wave 2] Sponsored DUST — gasless payer.** Official pattern (docs:
  `guides/dust-sponsorship`; reference repo
  `midnightntwrk/example-private-party`): the payer proves, balances its own
  value side and binds; a TacitPay sponsor service adds a `['dust']`-only fee
  offer and submits. Fees only — not a shielding mechanism (D-022). Removes
  the register-NIGHT-and-wait-for-DUST wall a first-time payer hits; needs a
  small always-on sponsor wallet service, so it lands with the first backend
  component.
- **[Wave 1 polish] Pay-page balance pre-check** — detect a payer with no
  spendable balance of the invoice token (USDM on Preview) before
  "Balancing fees" spins forever, and say why in token terms.
- **[Wave 1 polish] Balancing-stage timeout** — the truth gate covers
  post-submit; the wallet-side balancing call needs its own honest timeout.
- **Transaction-hash deep links** — wallets report ledger identifiers,
  explorers index hashes; resolve id → hash via the indexer's
  `transactions(offset:{identifier})` and deep-link the success dialog.
- **Orphaned private-state records** — a way to clear local invoice records
  whose ids never reached any chain (tonight's ghosts linger as OPEN rows in
  the sandbox store).
- **Password-field accessibility nit** — the passphrase form triggers the
  Chrome "password forms should have username fields" advisory.
- **[Wave 2] UI smoke tests** — packages/ui ships with no test runner at all;
  Wave 1 rode on typecheck, review, and the hands-on browser E2E. Wire up a
  minimal vitest + happy-path smoke before the UI grows another lane.
- **[Wave 1 polish] CLI connectivity regex over-matches** — the friendly
  "Cannot reach the network" mapper regexes the whole error text, and
  "WebSocket" appears in polkadot-js stack traces, so genuine node rejections
  (error 192 tonight) masquerade as connectivity failures. Match on the
  message, not the stack.
- **[SHIPPED Aug 27, amended by D-023] Connections survive a refresh —
  wallet only.** The chosen wallet persists per network and reconnects
  silently after a reload; the passphrase deliberately does NOT persist
  (security review caught sessionStorage spilling to disk — see D-023), so
  one fresh prompt remains. **[Wave 2]** Sealed-token unlock (WebCrypto
  non-extractable key) to remove that last step without storing a secret.
- **[Wave 1 polish] The pay button must refuse the sandbox** — with a live
  network's invoice open and the contract session locked, Pay runs against
  the mock and reports "Unknown invoice"; the banner warns but should not be
  the only guard. Disable Pay and point at Settings until the session is live.
- **[Post-buildathon] Marketing site as its own Next.js repo** — considered
  Aug 27 and deliberately deferred: the host split + lazy-loaded landing give
  the lean-app outcome inside one repo, and the bespoke GSAP landing would
  cost a risky port for no judge-visible value mid-wave. Revisit when real
  SEO/SSR traffic exists.
