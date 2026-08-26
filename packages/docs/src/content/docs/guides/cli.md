---
title: Use the CLI
description: The whole invoice lifecycle without a browser — deploy, create, pay, withdraw, verify.
---

`packages/cli` drives the entire protocol from a terminal — the same client library the app uses, so nothing here is a second implementation. It is how the judge sandbox is seeded and how the live Preview deployment was made.

## Setup

The CLI reads its network from `TACITPAY_NETWORK` (`local` or `preview`; default `preview`) and its wallet from `TACITPAY_SEED` or `.env.<network>`. **Seeds are never printed** — by the CLI or by anything else in this repository.

```bash
yarn workspace @tacitpay/cli build
alias tacitpay="node packages/cli/dist/index.js"
```

## The lifecycle

```bash
# Deploy a contract, fixing its payment token forever
tacitpay deploy --network preview --token USDM

# Issue an invoice — prints the pay link (private payload in the #fragment)
tacitpay invoice create --amount 2 --memo "design retainer - august" --expires 2026-09-30

# Pay it, from the payer's wallet
tacitpay invoice pay --link "<url-or-fragment>" --lane unshielded

# Check the public record — the same read anyone can do
tacitpay invoice status --id <invoice-id>

# Collect, as the issuer
tacitpay invoice withdraw --id <invoice-id> --lane unshielded --to <address>

# Or cancel one that is still OPEN
tacitpay invoice cancel --id <invoice-id>
```

`--lane` picks the [settlement lane](/concepts/lanes/) and defaults to shielded; use `unshielded` on networks configured for it (Preview today). Unshielded withdrawals default `--to` to the current wallet's own unshielded address.

## The judge sandbox

Against a [local devnet](/guides/local/):

```bash
tacitpay demo seed          # or: yarn demo:seed
```

funds two wallets, deploys a contract, and leaves three invoices in known states — one OPEN, one PAID, one WITHDRAWN — printing the contract address, the invoice IDs and a ready-to-open pay link. Re-running reuses the sandbox in seconds; `--reset` starts fresh.

Utility commands: `tacitpay wallet dust-status` (fee resource state) and `tacitpay wallet fund-local` (fund the current wallet from the devnet genesis).
