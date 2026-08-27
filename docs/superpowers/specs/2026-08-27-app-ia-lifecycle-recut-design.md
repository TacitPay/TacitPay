# App IA: the lifecycle re-cut

**Date:** 2026-08-27
**Status:** IMPLEMENTED 2026-08-27 per the plan at
`docs/superpowers/plans/2026-08-27-app-ia-lifecycle-recut.md`. All gates green
(typecheck, lint, format, build) and the browser pass proved both frozen URLs
against real preview-chain data. Uncommitted — awaiting Marcus's own browser
test and his word to commit. The design below was approved section-by-section
on 2026-08-27; the one OPEN question resolved (Verification gets the nav slot).
**Owner decisions in this doc were made by Marcus in the brainstorming sessions
of 2026-08-27.**

## The problem

The app's navigation is organised by **role** — `Merchant` (invoices I issued),
`Receipts` (invoices I paid) — while the product's own vocabulary, its docs and
its whitepaper are organised by the **lifecycle of an invoice**. The two do not
line up, and the seam shows:

- `Pay` appears nowhere in the nav, because `/pay` is meaningless without a
  payload (`/pay#<base64>`), so there is no page to link to. A user reasonably
  asks where paying happens.
- `Verify` in the nav does not open the verification page; it jumps to a _form_
  on the home page, because `/verify/:id` needs an ID.
- `Receipts` is the payer's half of the same object `Merchant` holds the other
  half of, but nothing in the interface says so.

## Decisions taken

1. **Spine = lifecycle, not people.** The nav follows the invoice's stages, and
   each screen shows whichever side of it applies to you. Chosen over
   "merchant is resident, others visit" and "merchant and payer both resident".
2. **Payment = the payer's side.** Money you send out: open an invoice link to
   pay it, and the receipts of invoices you have paid. Today's `/pay` and
   `/receipts` merge into one section. `Invoice` keeps the merchant's side —
   create, track, withdraw.
3. **Home = status dashboard** when there is something to show. See the wallet
   policy below for the disconnected state, which resolves this against a cold
   visitor.
4. **Approach B — full re-cut.** Not just a relabel: invoices become an index +
   detail route, receipts become a settlement table with filters, and the pay
   flow becomes conceptually part of the Payment section — its `/pay#` URL
   frozen in place, reached from the paste form on `/payments`, never moved
   under it. Marcus's reasoning: "we still have 1 week, we have plenty of
   time." (Note for the record: the Wave 1 deadline on file is **Sep 16**; the
   demo video and the AKINDO submission are still ahead of us and are the real
   schedule risk.)
5. **No wallet gate on the front door.** Gate at the moment of proving, never at
   the door. Full policy below.

## The wallet policy (load-bearing — this is the product's own argument)

A wallet gate on `app.tacitpay.xyz` would have the app disprove its own thesis in
its first ten seconds. Three reasons it must not exist:

- The whitepaper claims verification needs "no wallet, no account, no
  permission." A gate makes that false.
- A payer must see what they are being asked to sign **before** connecting. The
  payload is in the URL fragment, so `/pay#…` can render amount, memo and expiry
  with no wallet at all. "Connect first, then we'll tell you" is how phishing
  behaves.
- Judges and reviewers land cold, without Lace installed.

**One home route, two honest states:**

| State        | Home shows                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Disconnected | The chooser — "What would you like to do?". Orients a cold visitor; it is the demo's opening shot. |
| Connected    | The dashboard — awaiting payment, ready to withdraw, recent activity.                              |

Per-section requirement:

| Section      | Without a wallet                                                                       |
| ------------ | -------------------------------------------------------------------------------------- |
| Verification | Fully works. Always.                                                                   |
| Payment      | Opens the link, shows what is being asked, reads chain status. Connect only to settle. |
| Invoice      | Explains itself and shows the empty shape; connect to create or withdraw.              |
| Settings     | Fully works — network and proving are wallet-independent.                              |

Rule: **empty-with-a-reason beats decorative.** Never render skeleton rows or
fake numbers to a disconnected visitor.

The header `WalletButton` (shipped 2026-08-27, uncommitted at time of writing)
is what makes this clean: connecting is one click from anywhere, so no page owns
a gate. `WalletGate` continues to handle in-page connection for actions that
cannot proceed without one.

## Published contracts — MUST NOT BREAK

These URLs are in people's hands and in published documents. They are renamed by
nobody, ever:

- **`/pay#<payload>`** — emitted by the CLI (`packages/cli/src/local.ts` asserts
  links start with `/pay#`), documented in `packages/docs/src/content/docs/
concepts/links.md`. Invoice links already sent must keep working.
- **`/verify/:invoiceId`** — documented in the whitepaper (§ truth gate) and in
  `guides/app.md` as the auditor's entry point.

Everything else is internal and may move, with redirects.

## Target route map

| Today            | Target          | Notes                                                              |
| ---------------- | --------------- | ------------------------------------------------------------------ |
| `/app`           | `/app`          | Chooser when disconnected, dashboard when connected.               |
| `/merchant`      | `/invoices`     | Index + detail. `/merchant` → redirect.                            |
| —                | `/invoices/:id` | New: invoice detail (status, timeline, withdraw).                  |
| `/receipts`      | `/payments`     | Settlement table with filters. `/receipts` → redirect.             |
| `/pay#<payload>` | **unchanged**   | Conceptually a child of Payment; URL frozen.                       |
| —                | `/verification` | New: the ID form gets a real page so the nav item leads somewhere. |
| `/verify/:id`    | **unchanged**   | The result URL; frozen.                                            |
| `/settings`      | `/settings`     | Unchanged.                                                         |

## The approved design

Presented section-by-section and approved by Marcus on 2026-08-27. Grounded in
the code as it stood that day — every claim below was checked against the
files, not remembered.

### 1 · Architecture — routes and redirects

The router (`packages/ui/src/App.tsx`) keeps its exact structure — the app-host
guard, the lazy chunks, the error boundary are all untouched. Only the route
table inside changes, per the map above. Mechanics:

- **Redirects are client-side**: `<Route path="/merchant" element={<Navigate
to="/invoices" replace />} />` and the same for `/receipts` → `/payments`.
  Vercel's SPA rewrite already lands every path on the app, so old bookmarks
  hit the `Navigate` and arrive cleanly; no `vercel.json` change.
- **Each new page gets its own lazy chunk**, same pattern as the existing
  pages.
- **`ANCHOR_ROUTES` drops `/app`** — the `#verify-invoice` anchor ceases to
  exist once the form has its own page. Verified: the only references to that
  anchor are `AppShell` (nav + footer) and the form itself in `AppHomePage`;
  the marketing surfaces never point at it.

### 2 · Components — what each page is

- **Nav** (relabelling the uncommitted icon nav): Invoices `ReceiptText` ·
  Payments `MoneySend` · Verification `Verify` · Settings `Setting2` — all four
  names verified against `iconsax-reactjs`'s exports. The footer's App column
  updates to match. `WalletButton` ships exactly as written.
- **Home** — one route, two honest states read from `useProving().connection`.
  Disconnected: today's chooser, re-pointed — the merchant card goes to
  `/invoices`, the paste-a-link card keeps its inline form (the payer's fastest
  path, needs no wallet), the verify card becomes a doorway to `/verification`.
  Connected: a dashboard of three strips — awaiting payment (status OPEN),
  ready to withdraw (status PAID), recent payments — each a summary linking
  into its section.
- **Invoices** (`/invoices`) — `MerchantPage`'s create card and table, with
  rows now linking to the detail route.
- **Invoice detail** (`/invoices/:invoiceId`) — the one genuinely new screen,
  and it is the thesis as a page: the private record you hold
  (`listMyInvoices` → find by id) beside the public status the chain shows
  (`getInvoiceStatus`), with withdraw / cancel / copy-link moved here where
  they have room. `InvoiceView` already carries `status`, `link`, `createdAt`,
  `expiresAt`, `txId` — the page is field-reads, not new derivations.
- **Payments** (`/payments`) — the paste-a-link form on top (this is where
  "where is pay?" gets its answer), the receipts table beneath, with a status
  filter — honest, because `ReceiptView` carries its own `status`.
- **Verification** (`/verification`) — `PageHeader`, the 64-hex form moved from
  home, a sentence on what verification proves, and no wallet anywhere near it.

### 3 · Data flow

No new API surface — the design's quiet win. The dashboard composes
`listMyInvoices()` + `listMyReceipts()`; the detail page composes
`listMyInvoices()` + `getInvoiceStatus(id)` — both with `Promise.allSettled`,
so one half failing does not blank the other. Pages keep the repo's existing
pattern — local state, `useCallback` load, `useEffect` — no query library
introduced. Connection state already flows through the one proving context, so
connecting via the header `WalletButton` flips the home page live without a
reload.

### 4 · Error handling

The wallet policy's rule applies mechanically: disconnected visitors get
**empty-with-a-reason** (`EmptyState`), never skeletons —
`TableSkeleton`/`DetailSkeleton` appear only while a real fetch is in flight.
The detail route with an ID this wallet does not hold gets an honest "not in
this wallet's private state" plus a link to `/verify/:id`, because the public
half is still anyone's to see. Validation and API failures reuse
`getErrorMessage` + `ErrorState` + retry, as `ReceiptsPage` does today.

### 5 · Testing and verification

`packages/ui` has no unit-test rig, and none is added mid-Wave — that would be
scope creep dressed as rigor. The gate is: all workspace checks green
(typecheck, lint, format, build), then a scripted browser pass over a fixed
checklist — every route in both themes, both home states, redirects landing,
and the two frozen URLs proven end-to-end with a real CLI-emitted `/pay#` link
and a real `/verify/:id`. Plus a final grep proving `/merchant`, `/receipts`
and `#verify-invoice` dangle nowhere.

## Blast radius outside the app

Small, and verified by grep on 2026-08-27 rather than assumed:

- `packages/docs/src/content/docs/guides/app.md:17` — "**Merchant → New invoice.**"
  is the only doc line that names the old nav. Line 29's "merchant side" is
  role vocabulary and survives — the product keeps "merchant" as a word for the
  person; only the nav stops using it as a place name.
- No literal `/merchant` or `/receipts` route path exists anywhere in the docs,
  the CLI, or the README.
- The `#verify-invoice` anchor is referenced only by `AppShell` (nav + footer)
  and `AppHomePage` itself; both `AppShell` references re-point to
  `/verification`.
- `packages/cli/src/local.ts:123` — asserts `/pay#` prefix. Unaffected, because
  `/pay` is frozen. Do not touch.

## Resolved 2026-08-27 — Verification gets the nav slot

Marcus's call, made when the design sections were presented. Verification joins
the nav rather than becoming a header search field. The reasoning that carried:
verification is the whitepaper's headline claim — "no wallet, no account, no
permission" — and the nav is where a product displays its capabilities, so a
reviewer finds it in one second. The header is also already fully occupied
(logo, nav, docs, theme, wallet), and a persistent input there has no good
mobile answer. The `/verification` page was never in question — the docs
promise it; this settled only how people reach it.

## Out of scope

- Any change to the contract, circuits, or the CLI.
- Any change to `/pay#` or `/verify/:id` semantics.
- The marketing site and the docs site, beyond the one guide line above.

## Prior art in the repo to follow

- `WalletGate` for in-page connection.
- `PageHeader` for section headings (eyebrow + title + lede).
- `DataStates` for empty/loading/error shapes.
- `SandboxBanner` for the simulated-data notice.
