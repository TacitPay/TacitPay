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

- **[Wave 1 — DECIDED 2026-08-26, see D-020] Preview pay leg goes
  `receiveUnshielded`.** The `initSwap` spike falsified road (a): the swap
  builds, signs and proves, and the node rejects it with Custom error 199
  (midnight-node #1206's signature) through either proof server. Build the
  `receiveUnshielded` path per PRD §16.2; keep the shielded path as the
  flagship on local devnet and future-Preview.
- **[Blocked upstream] `tacitpay wallet shield`** — the swap wrapper is
  written and correct (session archive: swap-shield-final.mjs); it graduates
  to a CLI command the day the node accepts shielding mints.
- **[Wave 2] In-app "Shield funds" button** — the same swap driven through the
  dApp connector, offered right in the pay page's shielded-balance pre-check.
  No wallet ships this today; TacitPay doing it is a differentiator.
- **[Wave 1 polish] Pay-page shielded-balance pre-check** — detect a payer
  with no shielded coin before "Balancing fees" spins forever, and say why.
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
