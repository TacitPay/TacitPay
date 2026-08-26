# Wave 1 execution plan — "The loop works" (Aug 27 – Sep 16)

Working checklist derived from PRD §14.1. The PRD stays the spec; this file tracks
execution state across sessions. Verification for every task = the §11.5 local gate:
`yarn compile && yarn lint && yarn typecheck && yarn test` (plus `yarn test:int` when
the devnet is up). No CI by owner decision (D-008).

## Scope items (PRD §14.1 "must ship")

- [x] 1. Contract: `tacitpay.compact` — createInvoice / payInvoice / withdraw /
      cancelInvoice, Variant A escrow, compiles clean with compact 0.31.1.
      DONE 2026-08-23: compiled first try, zero functional deviations from §6.6;
      all six VERIFY items resolved (persistentCommit takes struct type args;
      Map.insert overwrites; disclose() needed on receive/insertCoin args, not
      sendShielded; blockTimeLt(Uint<64>) in unix seconds; struct literals OK).
      Adversarial security review passed; three design-level findings recorded
      (invoiceId squat namespace → Wave 2 candidate; escrow-nonce Zswap-key
      oracle → §4.5/§6.5 wording corrected, Variant B closes it; no escrow exit
      without merchant → refunds are Wave 2 §15.6, testnet-only until then).
- [x] 2. Unit tests: U-01…U-17 all real and passing offline (plus U-17b pinning
      the Variant A exposure window). Coin circuits fully simulable in
      compact-runtime 0.16.0 — NOTHING deferred to integration. Gate:
      20 passed | 10 todo (Wave 2/3 block intact).
- [x] 3. Integration test on local devnet — DONE 2026-08-24. Full create → pay
      → withdraw with two wallets against real proofs, gated behind
      `TACITPAY_INT=1` so `yarn test` stays offline. Asserts the whole state
      machine plus the merchant's shielded NIGHT balance actually increasing,
      and repeats the privacy sweep against real indexer data using both
      parties' real secret keys. Verified independently: **60 passed, exit 0,
      117s**. Surfaced and fixed a WASM dual-instance bug (D-012).
- [x] 4. `packages/api`: Wave 1 `TacitPayApi` (§8) — link codec, private state,
      circuit calls, ledger reads, Node six-provider wiring, browser skeleton,
      §8.4 error mapping. DONE 2026-08-24; verified independently: **59 passed,
      6 todo**, typecheck clean. Forced a version correction (D-011): the PRD's
      Midnight.js 4.0.4 never existed — pinned 4.1.1, wallet SDK from the
      un-hyphenated `@midnightntwrk` scope. Was open at the time: the browser
      DApp-connector wallet/proof slots were typed stubs pending the §8.3 Day-3
      VERIFY. **Closed by 6c below** — they are real providers now.
- [x] 5. `packages/cli`: real `parseArgs` CLI — deploy, invoice lifecycle,
      dust-status, `.env.<network>` seeds, deployment files. DONE 2026-08-24;
      typecheck clean, help output real. `demo seed` / `wallet fund-local` exit 2
      with a "needs local devnet" notice until the integration lane lands.
- [x] 6. `packages/ui`: all six routes + 404 built and rendering (§9). DONE
      2026-08-24 against a typed mock adapter locked to the §8.1 interface, so
      the real API swaps in behind one provider. Verified independently:
      typecheck / build / eslint / prettier all clean, build 492 kB (141 kB gz);
      §9.4 copy rules clean (no "anonymous"); pay payload read from
      `location.hash`, never the query string. Wallet discovery already
      enumerates `window.midnight` generically with safe icon handling.
      Remaining before Preview: swap mock → real api, then §8.3 browser
      providers (Day-3 VERIFY: mirror example-bboard).
- [x] 6b. **Multi-wallet + three-tier proving (D-010)** — DONE 2026-08-24.
      Wallet discovery by `rdns`/name over `window.midnight` (Lace + 1AM),
      runtime feature detection of `getProvingProvider`, local + user-supplied
      prover tiers with health checks, active tier surfaced in the header and
      explained in `/settings`. Verified independently: typecheck, build,
      eslint, prettier all clean; copy rules clean. Still open: the Day-3
      VERIFY on whether the shipping Lace build implements the method.
      Also landed: a marketing page at `/` with the app behind `/app`, built
      from the logo's geometry and palette.
      _(original scope note below)_
- [x] 6b-scope. Queued as a follow-up
      to 6 so it does not collide with the in-flight UI lane. Discover wallets by
      scanning `Object.values(window.midnight)` on `rdns`/`name` (Lace + 1AM),
      feature-detect `getProvingProvider`, fall back to `localhost:6300`, allow a
      user-supplied prover URL in `/settings`, and show the active proving tier.
      Mirror the Edda Labs `midnight-starter-template` wallet widget.
      Blocking VERIFY first: does the shipping Lace build implement
      `getProvingProvider()` (lace#2224 closed 2026-08-07)? Record in D-010.
- [x] 6c. **UI connected to the real chain** — DONE 2026-08-24. `packages/api`
      browser providers are no longer stubs: a real DApp Connector adapter
      (`balanceUnsealedTransaction` / `submitTransaction`, Bech32m keys
      normalised with the library's own helpers, tx id derived as
      `identifiers().at(-1)` exactly as `WalletFacade` does) plus the three-tier
      proof provider. `packages/ui/src/lib/api/real.ts` adapts it to the §8.1
      boundary — dual merchant/payer instances, five proof stages reported by
      wrapping the providers that perform them. Reachable from `/settings`.
      Verified independently: lint, typecheck, build all clean; 86 offline tests
      (66 api + 20 contracts), 7 of them new for the connector bridge; the Vite
      build emits both WASM modules and copies the ZK artifacts into `dist/`.
      Recorded as D-013 and D-014. The connector's `tx: string` encoding was
      then verified as hex against midnight-js's own
      `testkit-js/src/wallet/dapp-connector-wallet-adapter.ts` — the receiving
      side of the same interface — including the transaction markers in both
      directions. **Still open:** the browser path awaits a funded wallet.
- [ ] 7. Deploy to Preview; commit `deployments/preview.json`; address in README.
      **Blocked on wallet funding.**
- [x] 8a. Docs: PRIVACY.md (who-sees-what table, INV-1…INV-11 each mapped to the
      test that enforces it, trust assumptions, limitations), ARCHITECTURE.md
      (four Mermaid circuit sequences derived from the code, provider table,
      link data flow), WAVE-CHANGELOG.md "Wave 1", DEMO-SCRIPT.md (shot list plus
      pre-recording checklist). DONE 2026-08-24.
- [x] 8b-deck. Deck — DONE 2026-08-24. Twelve slides at `docs/deck/index.html`,
      following the §17.2 outline. Built on the app's own brand (zinc
      monochrome, Instrument Serif/Sans, IBM Plex Mono) so the deck and the
      product read as one thing. Slide 8 uses the real seeded sandbox contract
      and its three invoice ids rather than placeholder stills, and says plainly
      that the signing path has not run against a wallet yet. Present with
      arrow keys; scroll-snapped, responsive, works in both themes.
- [ ] 8c. The 3–5 minute video. **Owner action** — needs the Preview run.
- [x] 9a. Repo topics set (8, including `midnightntwrk`) and Apache-2.0 licensed.
- [ ] 9b. **Flip repo public** (D-003) before submission. **Owner action.**
- [x] 10. Judge sandbox — DONE 2026-08-24. `tacitpay demo seed` /
      `yarn demo:seed` funds two wallets (NIGHT + DUST, polling for a spendable
      coin), deploys a contract and leaves three invoices OPEN / PAID /
      WITHDRAWN, printing the address, the ids and a ready `/pay#` link.
      Re-runs reuse the sandbox in seconds; `--reset` starts over. Seeds are
      never printed. `wallet fund-local` is real, and chain commands now fail
      with "Run yarn env:up, then retry" instead of a connection stack trace.

## Day-0 prerequisites (user-side, long lead times — PRD §14.1 Day 0)

- [ ] Kickoff workshop Aug 26 22:00 JST → judge guidance into docs/DECISIONS.md.
- [ ] Fund two Lace Preview wallets; start DUST registration (~12 h lead, §12.4).
      **This is now the only thing blocking every remaining engineering item.**
- [x] tUSDM bridge spike — completed ahead of schedule 2026-08-22 (§16.2):
      5 tUSDM on Preview, token color `003bacd9…` confirmed.
- [x] Proof server: `midnightntwrk/proof-server:8.1.0` pulled and RUNNING,
      verified 2026-08-24 — `GET http://localhost:6300/` returns
      `{"status":"ok"}`. Matches the §0.2 version row.
- [x] `midnight-local-dev` cloned to `../midnight-local-dev` and wired:
      `yarn env:up` / `env:status` / `env:down` now drive `scripts/devnet.sh`
      (was a TODO stub). Verified `env:status` works; PRD §12.5 rewritten with
      the verified ports, images, funding flow and the container-name collision
      gotcha. Node + indexer images pulling.
- [x] Devnet fully UP and verified 2026-08-24 — `yarn env:up` brought all three
      containers to healthy (node :9944, indexer :8088, proof server :6300) and
      all three endpoints answer. The hand-started proof-server container was
      removed first so compose could own the name; it was recreated identically.
      Probe correction: the indexer answers GraphQL only over **POST** (a GET
      returns 405), so `env:status` posts a real `{__typename}` query — which
      proves the API works rather than just that the process is alive.

## Smaller items closed 2026-08-24

- [x] Fonts self-hosted from `@fontsource`; the app makes no automatic
      third-party request at all. The `TODO(pre-submission)` in `index.html` is
      gone and PRIVACY.md's who-sees-what table has no CDN row.
- [x] Marketing page code-split from the app. Entry chunk 525 kB → **23.1 kB**;
      the Midnight stack is an 866 kB chunk fetched only on connect.
- [x] `vercel.json` — build command, `packages/ui/dist`, the SPA rewrite that
      keeps `/verify/<id>` alive through a refresh, and security headers.

## Preview runbook — the exact sequence once the wallets are funded

Everything below is blocked only on funding and DUST registration (~12 h lead).
Nothing else in Wave 1 is waiting on anything.

1. **Put the merchant seed where the CLI looks for it.** A 32-byte hex seed, in
   `.env.preview` at the repo root, as `TACITPAY_SEED=<hex>`. That file is
   gitignored; the CLI never prints a seed.

2. **Confirm the wallet can actually transact**, not just that it holds NIGHT —
   DUST registration is what decides that:

   ```bash
   TACITPAY_NETWORK=preview node packages/cli/dist/index.js wallet dust-status
   ```

3. **Deploy.** One command; it writes `deployments/preview.json`.

   ```bash
   yarn compile
   yarn workspace @tacitpay/cli run build
   TACITPAY_NETWORK=preview node packages/cli/dist/index.js deploy --network preview --token NIGHT
   ```

4. **Prove the loop head-lessly before involving a browser**, so a failure is
   attributable to the chain rather than to a wallet extension:

   ```bash
   TACITPAY_NETWORK=preview node packages/cli/dist/index.js invoice create --amount 12.50 --memo "Preview smoke test"
   TACITPAY_NETWORK=preview node packages/cli/dist/index.js invoice status --id <id>
   ```

5. **Rebuild the UI with the address baked in**, then host `packages/ui/dist`
   (`vercel.json` already carries the build command, the SPA rewrite and the
   security headers):

   ```bash
   VITE_TACITPAY_CONTRACT_PREVIEW=<address> yarn workspace @tacitpay/ui run build
   ```

6. **Then the part that is genuinely untested:** connect a wallet extension in
   `/settings`, unlock private state, and create → pay → withdraw. This is the
   only path no machine has exercised. If the DApp Connector disagrees with the
   adapter, the likeliest single point of failure is the transaction encoding,
   isolated in one pair of functions in `packages/api/src/providers/browser.ts`
   (D-013).

7. **Commit `deployments/preview.json`**, put the address in the README badge and
   on deck slide 8, then record the video against
   [`../DEMO-SCRIPT.md`](../DEMO-SCRIPT.md).

## Token plan (per PRD §3.4 timing hook + §16.2)

Contract is token-agnostic (`paymentToken` set in the constructor). Wave 1 demos
shielded tNIGHT as the full-privacy path and tUSDM on Preview since the bridge
spike already succeeded; tUSDM-in-the-video is the Wave 2 hard commitment;
mainnet USDM is Wave 3 (stretch).
