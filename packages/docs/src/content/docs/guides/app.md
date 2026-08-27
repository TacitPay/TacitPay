---
title: Use the app
description: Create, share, pay, withdraw and verify an invoice in the browser at app.tacitpay.xyz.
---

The reference app lives at [app.tacitpay.xyz](https://app.tacitpay.xyz). Out of the box it runs on an in-memory **sandbox** — every screen is explorable with no wallet and no chain, and everything simulated is clearly marked as such. To transact for real, connect it to a live contract first.

## Go live

1. **Install a Midnight wallet.** Lace (with Midnight enabled) or 1AM. Fund it from the network's faucet — and for Preview, note that invoices are denominated in **tUSDM**, so the payer needs tUSDM, not just tNIGHT.
2. Open **Settings → Contract connection**. Pick the network, paste the contract address (the live Preview address is in [Networks & deployments](/reference/networks/)), and connect your wallet.
3. **Unlock private state** with a passphrase. It encrypts your invoice bodies in this browser, never leaves the device, and cannot be recovered — treat it accordingly.
4. Wait for the **Live** badge. Until it shows, every write is sandbox theater by design — the app will refuse to pretend a sandbox action touched a chain.

## Issue an invoice

**Invoices → New invoice.** Enter the amount, a memo, and optionally an expiry. Your wallet proves and submits `createInvoice`; the app then polls the ledger until the invoice is visibly there — the success screen only appears once the chain confirms it.

What you get is a **link**. Everything private rides in its `#fragment`, which browsers never send to any server — the link _is_ the invoice. Send it over whatever channel you already use.

## Pay one

Open the link (or paste it into **Pay**). The app reads the public record, shows the amount, memo and expiry from the fragment, and checks the invoice is still OPEN and unexpired — refusing up front if not, or if the app is in sandbox mode while the invoice lives on a real network.

**Pay invoice** has your wallet prove the commitment preimage matches and submit the payment. On an unshielded network the transfer itself is public (the invoice contents never are — see [Settlement lanes](/concepts/lanes/)); the app's amount tooltip states this wherever it applies.

## Withdraw

Back on the merchant side, a PAID invoice offers **Withdraw**. Your wallet proves ownership from your secret; the funds leave the contract's custody for your wallet. The app confirms the balance change on the ledger before declaring success.

## Verify — the third-party view

`/verify/<invoice-id>` needs no wallet, no account, no permission. It reads the public record and shows: the invoice exists, its status, its expiry. That is everything a verifier can learn — which is the point. Hand this URL to an accountant, a counterparty or a court.

## Your wallet's page

Once connected, click the wallet pill in the header to open **/profile** — the wallet _is_ the account, and this is its page: every address in full with one-tap copy, live balances (shielded, unshielded, DUST), and this wallet's activity counted up — invoices by status, money ready to withdraw, payments made. Hovering the pill shows the same numbers in miniature. Disconnecting from here ends the browser session only; your records stay in your wallet and private state.

## If something looks wrong

- **"This invoice lives on a real network"** on the pay page — the app is in sandbox mode. Go to Settings and complete the Live connection first; the page keeps the link while you do.
- **A hard refresh dropped the connection** — the wallet reconnects silently; the private-state passphrase is re-entered by design (it is never stored in the browser).
- **Proving unavailable** — the app shows which proving tier it looked for. See [What TacitPay cannot see](/concepts/cannot-see/) for the tiers and how to provide one.
