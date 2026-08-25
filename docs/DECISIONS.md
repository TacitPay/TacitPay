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
