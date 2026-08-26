---
title: What TacitPay cannot see
description: Structural privacy — the three components TacitPay does not run, and why that is the whole guarantee.
---

Every payment product says it respects your privacy. TacitPay's difference is structural: **there is no version of the system that could look, even if its authors wanted to.** Three components are missing on purpose.

## No server

Invoice details travel inside the [link fragment](/concepts/links/), which browsers never transmit. The web app is static files; the payment path runs device → wallet → chain. There is no backend to breach, subpoena, or quietly log — requests that are never made cannot be intercepted.

## No prover

Generating a zero-knowledge proof requires the private data as input — whoever proves, sees. So TacitPay never operates a prover. The app feature-detects, in order:

1. **In your wallet** — 1AM proves in-browser (WASM). Nothing leaves the tab.
2. **A local proof server** — `localhost:6300` via Docker; Lace's model today. Your data stays on your machine.
3. **A prover you host** — your own server over TLS, configured in Settings.

The active tier is always shown in the app. If none is available, the app says so and refuses to pretend — it will not silently route your data to a third party to get a proof made.

## No keys

Withdrawal and cancellation are authorized by a secret that exists only on the issuer's device, checked inside the circuit by re-deriving the invoice's owner tag. TacitPay holds no accounts, no custody, no recovery back door. Nobody at TacitPay can move funds or unlock invoice bodies, because there is nobody to ask.

## The cost of structural privacy

The same structure that removes trust removes training wheels, and the product says so plainly:

- The private-state **passphrase encrypts invoice bodies in your browser and cannot be recovered.** Lose it and the chain still proves your invoices existed and settled — but the amounts and memos are gone. (Export/import arrives in Wave 2.)
- **Verification is public but minimal.** Anyone with an invoice ID can confirm its status — and learns nothing else. There is no "admin view" with more; the public record is all there is.
