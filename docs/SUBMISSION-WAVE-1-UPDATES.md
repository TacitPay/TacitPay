# Updates in this Wave (Wave 1, Aug 27 to Sep 16, 2026)

## Form version (fits AKINDO's 3,000-character limit)

Wave 1 (Aug 27 to Sep 16): from a scaffold to a product live on Preview.

LIve Deployed URL: https://tacitpay.xyz/
Repo: https://github.com/TacitPay/TacitPay

1. Contract, deployed on Preview.

- Six Compact circuits: the core four with Variant A escrow plus an unshielded mirror pair so public networks settle bridged USDM. Ownership is proven from the witness secret, never ownPublicKey(); amount, memo and salt reach the chain only inside a hiding commitment.
- Live contract: https://preview.midnightexplorer.com/contracts/0847de8a3ad855db18622017f2333b673afd9a1a72e0127b3e766d0c23326d24

2. Tests

- 28 contract unit tests in the pure-JS runtime, no Docker, wallet or network. U-17 serialises the public ledger after a full lifecycle and asserts the amount is absent in four encodings, plus memo hash, salt and secrets. 70 library unit tests and a 67-test integration suite on a live devnet that asserts the merchant's balance increases after withdrawal. yarn test runs offline in seconds.

3. Library and CLI.

- packages/api is the only place a circuit is called (one audited path for CLI, app, SDK and MCP): strict link codec, private-state records, ledger reads, status observables, browser providers on DApp Connector 4.0.1 with three proving tiers.
- packages/cli: deploy, the full lifecycle, DUST status, and the judge sandbox (yarn demo:seed: funded wallets, a deployed contract, three invoices in known states, a ready pay link).

4. Web app, live at https://app.tacitpay.xyz.

- Static files only: the invoice payload rides the URL fragment. Ten routes: invoices, payments, verification (no wallet needed), profile, settings, /pay#... and /verify/:id.
- A truth gate confirms every mutation on the ledger before reporting success; a pay-page preflight checks balance and DUST; the link is disclosed as a bearer credential at the copy moment.
- Proven end to end on Preview: first invoice Aug 26, the full create, pay, verify, withdraw loop between two Lace wallets on Aug 27, every step confirmed on chain.

5. Hosting and docs.

- Landing https://tacitpay.xyz
- docs and whitepaper https://docs.tacitpay.xyz.
- README (privacy model, dual-ledger design, four judge paths, test inventory, known limitations)
- PRD, PRIVACY (eleven invariants mapped to tests), ARCHITECTURE, DECISIONS (24 records), an external audit answered (docs/AUDIT-RESPONSE.md) and the three-wave vision (docs/VISION.md).

6. Platform work.

- The pay circuit consumes a shielded coin and Preview offers no way to obtain one. Raised with the community; confirmed by Midnight core engineering (Aug 29) as a fixed-but-unreleased Wallet SDK gap.
- In-wave response: the unshielded lane, so Preview settles tUSDM (VIA Labs bridge from Cardano Preprod) with invoice contents still private; the shielded lane runs on the local devnet.

## Long version (for the record)

Everything below was built during the wave, from a scaffold on Aug 23 to a
product live on Preview. Repository: https://github.com/TacitPay/TacitPay.
Running record: https://github.com/TacitPay/TacitPay/blob/main/docs/WAVE-CHANGELOG.md

## 1. The Compact contract, deployed on Preview

- `contracts/tacitpay.compact`: six circuits. The core four (`createInvoice`,
  `payInvoice`, `withdraw`, `cancelInvoice`) with Variant A escrow, plus an
  unshielded mirror pair (`payInvoiceUnshielded`, `withdrawUnshielded`) so
  public networks can settle bridged USDM. Each lane guards the other's exit.
  Ownership is proven from the witness secret, never from `ownPublicKey()`;
  the invoice commitment is a `persistentCommit`, so amount, memo and salt
  exist on chain only inside a hiding hash.
- Deployed to Preview on Aug 26 (v1 hosted the first real in-browser invoice;
  v2 with both lanes is the live contract):
  `0847de8a3ad855db18622017f2333b673afd9a1a72e0127b3e766d0c23326d24`,
  https://preview.midnightexplorer.com/contracts/0847de8a3ad855db18622017f2333b673afd9a1a72e0127b3e766d0c23326d24
  (record: `deployments/preview.json`).
- Source: https://github.com/TacitPay/TacitPay/blob/main/contracts/tacitpay.compact

## 2. Tests and simulation

- 28 contract unit tests (U-01 to U-17, U-17b, U-29 to U-36) run in the
  pure-JS Compact runtime with no Docker, no wallet and no network, including
  the coin circuits. U-17 runs a full lifecycle, serialises the public ledger
  and asserts the amount is absent in four encodings along with the memo hash,
  the salt and both secrets. U-17b pins the Variant A exposure window so it
  stays a tested limitation.
- 70 unit tests in the shared library (link codec, amounts, errors, private
  state, the DApp Connector bridge, the unshielded lane) and a 67-test
  integration suite against a live devnet whose load-bearing assertion is that
  the merchant's balance increases after withdrawal.
- `yarn test` runs everything offline in seconds. Inventory:
  https://github.com/TacitPay/TacitPay#test-inventory

## 3. The shared library and the CLI

- `packages/api`: the only place a circuit is called, so the CLI, the app and
  Wave 2's SDK and MCP server share one audited path. Strictly validated
  invoice-link codec (it parses attacker-controlled input), private-state
  records, ledger reads, status observables, error mapping, Node and browser
  provider stacks on the DApp Connector API 4.0.1 with three feature-detected
  proving tiers.
- `packages/cli`: deploy, the full lifecycle, DUST status, local funding, and
  the judge sandbox (`yarn demo:seed`: two funded wallets, a deployed
  contract, three invoices in known states, a ready pay link; reruns in
  seconds).

## 4. The web app, live on Preview

- https://app.tacitpay.xyz. Vite, React 18, Tailwind 4, shadcn/ui, Iconsax;
  static files only, because the invoice payload lives in the URL fragment and
  a server would reintroduce the surface the privacy claim denies.
- Ten routes: invoices (create, detail, withdraw, cancel), payments (pay bar
  and receipts), verification (the third-party view, no wallet needed), the
  wallet's own profile page, settings (network, contract, proving tier,
  private-state passphrase), plus the frozen `/pay#…` and `/verify/:id`.
- Wallets discovered on `window.midnight` and treated as untrusted; live
  network and proving chips in the header; a truth gate that confirms every
  mutation on the ledger before reporting success; a pay-page preflight that
  reads the payer's balance and DUST and explains a shortfall with the funding
  path; the settlement pair in the create dialog (Public active, Private
  greyed "Coming in Wave 2"); the pay page names the pool it spends from; the
  link is described as a bearer credential at the copy moment; the passphrase
  form knows a first-time setup from a return visit, and a wrong passphrase
  gets a plain-English error instead of a WebCrypto code.
- Proven end to end on Preview: Lace 4.0.1 created an invoice on Aug 26
  (block 587,108); the complete loop (create, pay, verify, withdraw) ran
  between two Lace wallets on Aug 27, invoice `084318a7…f0342`, every step
  confirmed on chain.

## 5. Hosting, docs site and landing

- Landing: https://tacitpay.xyz
- Documentation and whitepaper: https://docs.tacitpay.xyz (whitepaper, five
  concept chapters, architecture and circuit reference, three guides,
  networks, FAQ, roadmap; fourteen pages, every claim sourced from the
  contract and the shipped evidence).

## 6. Documentation set

- README with the privacy model, dual-ledger design, the contract table,
  four judge paths (cheapest first, Docker requirement stated per path),
  test inventory, roadmap and known limitations:
  https://github.com/TacitPay/TacitPay#readme
- PRD (source of truth), PRIVACY (eleven invariants mapped to tests),
  ARCHITECTURE (hand-drawn diagrams and Mermaid sequences), DECISIONS (24
  records with reasons), BACKLOG, CURRENT-STATE:
  https://github.com/TacitPay/TacitPay/tree/main/docs
- An external product audit (Aug 28) answered point by point and folded into
  the roadmap: https://github.com/TacitPay/TacitPay/blob/main/docs/AUDIT-RESPONSE.md
- The product arc across three waves:
  https://github.com/TacitPay/TacitPay/blob/main/docs/VISION.md

## 7. Platform work and community engagement

- The payment circuit consumes a shielded coin, and no supported way exists
  for an ordinary user to obtain one on Preview. Diagnosed against the
  official docs, raised with the community, and confirmed by Midnight core
  engineering on Aug 29 as a fixed-but-unreleased Wallet SDK gap (not a
  protocol limit). Response inside the wave: the unshielded settlement lane,
  so Preview settles bridged USDM with the invoice contents still private,
  while the fully shielded lane runs on the local devnet. Recorded in
  DECISIONS D-020 (amended) and the README's known limitations.
- tUSDM bridged from Cardano Preprod over the VIA Labs bridge; Preview
  invoices are denominated in it.

## 8. Deck, script and video

- Twelve-slide deck: https://github.com/TacitPay/TacitPay/blob/main/docs/deck/index.html
- Six-slide recording deck: https://github.com/TacitPay/TacitPay/blob/main/docs/deck/demo.html
- The spoken script and the rules for the take:
  https://github.com/TacitPay/TacitPay/blob/main/docs/DEMO-TALK-TRACK.md
- Demo video: [link]
