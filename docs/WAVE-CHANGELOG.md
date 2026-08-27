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
- **Paying needs shielded tNIGHT, and the protocol offers no self-shield
  operation (D-020, corrected after a docs audit)** — the faucet dispenses
  transparent tNIGHT; `payInvoice` consumes a shielded coin. Lace has no
  conversion, `transferTransaction` sources per-pool, and `initSwap` — which
  we first mistook for the shield method, alongside community sources — is
  documented as a two-party atomic exchange, so our single-sided swap was
  rejected by the node as expected (`1010: Custom error: 199`). No shield
  primitive exists in the SDK's surface; shielded tokens are contract-minted;
  devnet shielded native is genesis-only. `receiveUnshielded` (PRD §16.2) is
  the design-intended Wave 1 road; a contract-minted shielded wrapper token
  is the Wave 2 candidate for private settlement on public networks.
- **Identifiers ≠ hashes** — wallets report the ledger transaction
  _identifier_; explorers index the _hash_. Both resolve via the indexer's
  `transactions(offset: {identifier|hash})`.
- Assorted fixes along the way: the per-network contract-address field now
  re-seeds on network switch, the proof stepper and wallet card lay out by
  container width instead of viewport, and `/pay` without a fragment offers a
  paste-a-link box instead of an error.

### Field notes — Aug 27, 2026 (the unshielded lane ships end-to-end)

- **The unshielded settlement lane is live at every layer.** Contract v2 on
  Preview — [`0847de8a…326d24`](https://preview.midnightexplorer.com/contracts/0847de8a3ad855db18622017f2333b673afd9a1a72e0127b3e766d0c23326d24),
  block 591,018, indexer-verified — is denominated in bridged USDM (D-022).
  Circuits, API, CLI flags and invisible UI lane-routing all landed in one
  night, and both lanes' complete lifecycles were proven on a fresh devnet
  deploy before any Preview token was spent (unshielded pay `0087b9c5…`,
  withdraw `000a8556…`; the shielded flagship regression stayed green on the
  same contract).
- **The night's one real bug was ours, and it was subtle**: unshielded inputs
  authenticate by _signature_, not proof. The node-wallet balancer proved and
  finalized but never signed, so the node rejected the lane with
  `1010: Custom error: 192` — masked at first by a CLI connectivity message
  whose regex matches "WebSocket" inside stack traces. One `signRecipe`
  between balancing and finalizing fixed it. Every pool has its own
  authentication currency.
- **1AM wallet, hands-on + site docs**: the most shielded-native wallet on
  the network hands out four addresses (shielded / unshielded / DUST /
  Cardano) and strictly segregates pools in its send flow — no
  unshielded→shielded conversion there either. That closes the last "maybe a
  wallet can shield" hope for Wave 1 from a second, independent angle. Its
  "DUST SPONSORED / ProofStation — zero gas fees" feature is the official
  dust-sponsorship pattern productized: live validation of the Wave 2 fee
  story in D-022.

### Field notes — Aug 27, 2026, 01:20 (the full browser lifecycle lands on Preview)

- **The complete invoice lifecycle ran browser-to-browser on public Preview,
  denominated in a stablecoin.** Invoice
  `084318a7ad082b57935e1070142775f6ae109e0b349d1cfe5ed6c861988f0342`
  ("design retainer - august", 2 tUSDM) on contract `0847de8a…326d24`:
  created from the merchant's Lace (tx `00f4bb85…`), paid from the payer's
  Lace through the unshielded lane (tx `003b8a25…`), withdrawn by the
  merchant (tx `00f0f626…`) — the merchant wallet's USDM balance rose by
  exactly the invoice amount. Every stage passed the truth gate's own
  indexer confirmation; the explorer shows only circuit names and sealed
  commitments throughout. Evidence frames:
  `~/Downloads/tacitpay-wave1-e2e-evidence-20260827/`.
- Found-and-fixed during the run: invoice links carry the raw token type,
  which rendered as a 64-hex "currency symbol" (now mapped to the network's
  display symbol, with hex fallbacks shortened); the amount-privacy tooltip
  now tells the lane-specific truth; wallet tiles follow container width and
  accept the SVG icons wallets actually inject (Lace's icon finally shows).
- Known UX debt, queued: a hard refresh drops the wallet + contract session
  (reconnect dance required), and the pay button will run against the
  sandbox when the invoice belongs to a live network — the banner warns but
  should not be the only guard.

### Field notes — Aug 27, 2026, 02:15 (domains, and the repo learns to build anywhere)

- **The product moved onto its own domains.** `tacitpay.xyz` is the
  marketing apex; `app.tacitpay.xyz` serves the app at its root (`/app`
  folds onto it). A shared `AppLink` hops hosts on the apex, a router-level
  guard bounces stray SPA clicks, host-scoped redirects catch hard loads,
  and the landing chapter is now lazy — an app visitor never downloads the
  marketing motion.
- **The org's Git builds went green.** Two root causes fixed: the Vercel
  build only compiled the UI (a fresh clone lacks the api's build output),
  and `contracts/managed` was gitignored — the compiled contract and prover
  keys are now committed so any clean clone proves.
- **The previous block's UX debt shipped the same night.** The pay button
  refuses to run a live network's invoice against the sandbox, and the
  wallet connection silently restores after a refresh. The private-state
  passphrase deliberately does not: it never touches browser storage
  (D-023) — memory-only by decision, re-entered by design.

### Field notes — Aug 27, 2026, 03:20 (the landing sheds words; the whitepaper gets a house)

- **The landing's onboarding pass.** Every lede from "The line" downward cut
  to the fewest words carrying the same meaning; the eight-packet disclosure
  corridor retired in favour of a single ledger card — four values written,
  four redaction bars stamped down, in a quick loop — because what the chain
  holds IS the claim.
- **docs.tacitpay.xyz.** A Starlight site in `packages/docs`: the whitepaper,
  five concept chapters, the architecture and circuit reference, three
  guides, three reference pages — sixteen pages, every claim sourced from
  the contract, the PRD and the shipped evidence, in the product's own
  palette and faces, with the repo's hand-drawn diagrams embedded
  theme-aware. The landing wears the doors: a docs icon in the header, an
  icon cluster in the footer.
- README truth-sync rode along: the contract section now lists all six
  circuits (the unshielded-lane pair included), and the repository map and
  live-URL footer know about `packages/docs`.

### Field notes — Aug 28, 2026, 01:00 (the app re-cut to lifecycle nouns, and the wallet gets a page)

- **The IA re-cut shipped** (spec:
  `docs/superpowers/specs/2026-08-27-app-ia-lifecycle-recut-design.md`). The
  spine renamed from roles to lifecycle: `/invoices` (+ `/invoices/:id`
  detail with withdraw/cancel), `/payments` (pay + receipts in one room),
  `/verification` in the nav, old routes kept as redirects. The frozen URLs
  (`/pay#…`, `/verify/:id`) never moved.
- **The home page speaks both states.** Disconnected: a three-door chooser.
  Connected: a dashboard that mirrors it — same three cards, now carrying
  data — under "Welcome back, `<address>`". Networks say their kind
  everywhere ("Testnet · Preview"), and the home eyebrow became the header's
  own network chip.
- **The wallet pill grew a hover peek, then a whole page.** Peek: live
  balances (official NIGHT/USDM marks from the Cardano token registry),
  every address with one-tap copy, Disconnect. Click: `/profile` — identity
  in full, statistics from the same private-state reads the dashboard uses,
  and a Session card. The old connected wallet dialog retired; connect flow
  untouched.
- **Payments reads top-down now** — connection banner first, then a centred
  explorer-register pay bar (the verification page's sibling, because both
  are the same gesture), then receipts.
- **The create dialog states the settlement lane** as the pair it will
  become: the active side is the network's real lane, the other sits greyed
  under "Coming in Wave 2" — the roadmap in the product, no control
  pretending to work. The pay page says which pool the money leaves, keyed
  to the invoice's own network.
- **An amber caution register** (`--sandbox-*`) marks everything
  provisional; modal overlays got a black-based `--overlay` token so dark
  mode dialogs darken instead of washing out; the settings tabs' active tab
  wears the primary ink.
- **Repo hygiene:** docs truth-synced to the re-cut (PRD §9.1 carries a
  supersession note; ARCHITECTURE/PRIVACY/CURRENT-STATE/demo script updated),
  vendored agent skills gitignored, and the last orphaned helper
  (`getWalletProvingCapability`) removed with the dialog that used it.

### Field notes — Aug 28, 2026, 03:00 (an external audit arrives, and the roadmap answers)

- **An external product audit landed** — eleven points against a hard
  definition of "complete product". Full triage in `docs/AUDIT-RESPONSE.md`:
  every point verified against official Midnight docs, sorted into
  already-true / ships-this-week / Wave 2 core / Wave 3 / deliberately-not,
  and folded into the PRD (new §3.5 definition of complete; §14.2/§14.3
  re-ordered by dated addenda; new specs §15.8 secure links v2, §15.9
  encrypted backup, §15.10 webhooks + embeddable checkout).
- **Three audit close-outs shipped inside Wave 1**, all UI-only so the frozen
  contract, payload schema and storage layer stay untouched in demo week:
  the pay page now runs a read-only **preflight** (invoice-pool balance +
  DUST, shortfall explained in token terms with the real funding path,
  advisory only); the create dialog says **"anyone holding this link can
  read the amount and memo and pay"** at the copy moment; and the Settings
  backup card states the true loss model under a "Coming in Wave 2" tag
  instead of a toast that over-promised.
- **The headline re-order:** Wave 2's theme widens from "Developers and
  agents" to _the product completes_ — shielded wrapper and settlement
  enforcement first, then funds safety (milestones, refunds, timeout escape),
  then the zero-setup payer (sponsored DUST per the official guide), then
  secure links and encrypted backup; SDK/MCP still in-wave, riding on a
  complete core. Wave 3 absorbs the business layer: real invoice documents,
  accounting exports, the independent contract audit and the business-model
  decision.
- **One assumption corrected by the official wallet matrix:** Lace does not
  prove in-browser (it needs a local proof server); 1AM proves in-browser
  via WASM with no extra setup. The app's runtime Proving chip already
  resolves this per wallet, which is why nothing in the product had it wrong
  — only our own field intuition did.
