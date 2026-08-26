# Wave changelog

What shipped in each wave, for judges (PRD §17.4). Waves 2 and 3 additionally
list what changed since the previous submission — a hard AKINDO requirement.

## Pre-wave (Aug 23, 2026)

### Shipped

- Repository scaffold per PRD §13: Yarn 4 workspaces (`contracts`, `packages/api`,
  `packages/ui`, `packages/cli`), Apache-2.0 license, local verification loop
  (Compact compile + lint/typecheck/test), network endpoint config, docs skeleton.
- Placeholder Compact contract (compiles under compiler 0.31.1).
- Wave 1 unit-test matrix U-01…U-17 pre-registered as vitest todos (PRD §11.2).
- TacitPay logo component (`packages/ui/src/components/Logo.tsx`) and README masthead (light/dark SVG).
- PRD v1.2: milestone escrow (§15.5), claim-based refunds (§15.6), recurring
  invoices (§15.7), receivables proofs (§16.4) and the judge sandbox committed
  into wave scopes; unit matrix extended to U-28.

## Wave 1 (Aug 27 – Sep 16, 2026)

### Shipped

**The contract** — `contracts/tacitpay.compact`, four circuits (`createInvoice`,
`payInvoice`, `withdraw`, `cancelInvoice`), Variant A escrow, compiled by
compact 0.31.1 against compact-runtime 0.16.0. Ownership is proven from the
witness secret, never from `ownPublicKey()`, which the prover supplies and so
cannot authorise anything. Tags hash a secret-derived public key rather than the
secret itself, because `persistentHash` is not hiding.

**The shared library** — `packages/api`. The only place a circuit call happens,
so the UI, the CLI and Wave 2's MCP server all share one audited path. Holds the
invoice-link codec (strictly validated — it parses attacker-controlled input),
the private-state records, the ledger reads, the status observables, and the
§8.4 error mapping. Node providers are fully wired; browser providers are built
on the DApp Connector API 4.0.1 with three feature-detected proving tiers.

**The command-line tool** — `packages/cli`. Deploy, the full invoice lifecycle,
`wallet dust-status`, `wallet fund-local`, and the judge sandbox. Seeds come
from `.env.<network>` and are never printed.

**The web app** — `packages/ui`. Vite + React 18 + Tailwind 4 + shadcn/ui with
Iconsax icons; deliberately not Next.js, because invoice payloads live in the
URL fragment and a server runtime would reintroduce exactly the surface the
privacy claim denies. Seven routes plus a 404. Wallets are discovered by
scanning `window.midnight` on `rdns`/name rather than by hardcoded key, and
every injected value is treated as untrusted. Fonts are self-hosted, so the app
makes no automatic third-party request at all.

**Proving, three tiers** — in the wallet (1AM, WASM, nothing leaves the tab),
a local proof server on `localhost:6300`, or a prover the user hosts themselves
over TLS. Capability is detected at runtime from `getProvingProvider`, never
inferred from which wallet is connected. TacitPay never operates a prover:
proving requires the private witness, so a prover we ran would see every amount
and counterparty (D-010).

**The judge sandbox** — `yarn demo:seed` funds two wallets, deploys a contract
and leaves three invoices OPEN / PAID / WITHDRAWN, printing the address, the ids
and a ready `/pay#` link. Re-runs reuse the sandbox in seconds.

### Tests

```
contracts        20 passed | 10 todo      offline, ~0.5s
packages/api     66 passed |  1 todo      offline, ~2s
packages/api     67 passed               against a live devnet, ~2min
```

The todos are pre-registered Wave 2/3 rows, kept visible so progress shows in
every run. **Nothing was deferred to the integration layer** — the coin-handling
circuits run in the pure-JS runtime, so the contract can be verified with no
Docker, no wallet and no network.

Two tests carry more weight than the rest. **U-17** runs a full lifecycle, then
serialises the public ledger and asserts the amount is absent in four encodings,
along with the memo hash, the salt and both secrets. **The integration test**
asserts the merchant's shielded balance _increases_ after withdrawal — a status
flipping to `WITHDRAWN` only proves state changed; the balance proves value
moved — and repeats the privacy sweep against live indexer data using both
parties' real secret keys.

### Known issues / next

- **Variant A escrow leaks more than value.** While the contract holds a coin,
  its `QualifiedShieldedCoinInfo` is public, including the nonce. Variant B
  closes it in Wave 2; test U-17b pins the current behaviour so any widening
  fails. See [`PRIVACY.md`](./PRIVACY.md) §6.
- **Invoice ids are an unauthenticated first-come namespace.** Deriving them
  in-circuit is a Wave 2 candidate.
- **Escrowed funds have no exit without the merchant** until Wave 2 refunds.
  Keep Wave 1 on testnet.
- **The browser _write_ path met its first real wallet on Aug 26** — see the
  field notes below. The create leg is proven end-to-end on Preview; the pay
  leg is in progress and requires the payer to hold **shielded** tNIGHT.
  The browser _read_ path was already proven (D-015).

### Field notes — Aug 26, 2026 (first real-wallet session)

Deployed to Preview (contract `1f37835dd1…21bc547`, `deployments/preview.json`)
and drove the app with a real Lace 4.0.1 wallet for the first time. What it
took, in order:

- **`events` polyfill** — the level-backed private-state provider does
  `class AbstractLevel extends EventEmitter`; without a browser `events`
  package the real API could not even be imported. Fixed via a Vite alias,
  same pattern as the existing `buffer` alias.
- **Bound `fetch`** — `FetchZkConfigProvider`'s default parameter captures the
  global unbound; Chrome throws "Illegal invocation" on the first prover-key
  download. Fixed by passing `fetch.bind(globalThis)`.
- **Ledger-confirmed success** — a wallet can return a transaction id for a
  submission that never reaches any chain (observed repeatedly). Every
  mutation now polls the contract's public state through the app's own indexer
  and fails loudly on a two-minute timeout; success dialogs can no longer lie.
- **Sandbox vs live is a trap** — with a wallet connected but the contract not
  yet unlocked (passphrase + "Connect to contract"), writes silently run on
  the in-memory mock with plausible-looking ids. A loud sandbox banner and
  obviously-fake stub ids are queued.
- **Paying needs shielded tNIGHT, and no shielding path exists in wallets
  today** — the faucet dispenses transparent tNIGHT; `payInvoice` consumes a
  shielded coin, so balancing hangs for a faucet-only payer. Lace's send
  refuses transparent→shielded, and the SDK's `transferTransaction` rejects
  shielded outputs without existing shielded funds. PRD §16.2's risk table
  anticipated exactly this; the candidate mitigations are a deeper SDK
  shielding spike and the `receiveUnshielded` circuit path. The local devnet
  pay leg works because genesis holds pre-shielded funds.
- **Identifiers ≠ hashes** — wallets report the ledger transaction
  _identifier_; explorers index the _hash_. Both resolve via the indexer's
  `transactions(offset: {identifier|hash})`.
- Assorted fixes along the way: the per-network contract-address field now
  re-seeds on network switch, the proof stepper and wallet card lay out by
  container width instead of viewport, and `/pay` without a fragment offers a
  paste-a-link box instead of an error.
