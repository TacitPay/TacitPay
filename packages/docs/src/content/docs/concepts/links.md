---
title: Invoice links
description: How an invoice's private details travel from issuer to payer without touching a server.
---

A TacitPay invoice travels as a link:

```text
https://app.tacitpay.xyz/pay#eyJ2IjoxLCJpZCI6IjB4OGYzYSIs...
```

Everything after the `#` is the **URL fragment** — and browsers never transmit the fragment in HTTP requests. The page loads; the fragment stays in the address bar; the invoice's private payload is decoded by JavaScript running on the payer's device. No server ever receives it, because no request ever carries it.

## What rides in the link

The fragment is an encoded payload holding what the payer needs to pay and nothing more:

- the invoice ID and the network it lives on,
- the **amount**, the **memo**, and the **salt** — the commitment's preimage,
- the token and the expiry, so the payer's screen can say exactly what they are agreeing to.

This is the one hop where the invoice's contents move between parties, and it is a hop the parties already trust: the issuer chose to send this payer the link, over whatever channel they already use — chat, email, a QR code. TacitPay adds no channel of its own and sees none of them.

## Why the payer needs the preimage

Paying is not "send tokens to an address". The payment circuit asserts that the payer's `amount`, `memoHash` and `salt` recompute to exactly the commitment stored at creation. That proof happens in zero knowledge — the chain checks the match without learning the values.

The consequence is a real guarantee for the payer: **you can only ever pay an invoice whose full contents you hold.** A tampered amount, a swapped memo, a reused ID with different terms — all fail the commitment check inside the circuit itself, not in some client-side validation that a hostile page could skip.

## Handle links accordingly

The link _is_ the invoice body. Anyone holding it can read the amount and memo (though only the issuer and actual payer hold the secrets that tie them to it). Send it over the channel you would send the invoice PDF today — and if it leaks, what leaks is one invoice's contents, never your history: nothing in one link connects to any other.

The `/verify/<id>` page needs no fragment at all — verification runs on the public record alone, which is the point: auditors get the fact, not the contents.
