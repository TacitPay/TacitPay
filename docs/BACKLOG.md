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
