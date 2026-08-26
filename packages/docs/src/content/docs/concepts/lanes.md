---
title: Settlement lanes
description: The shielded and unshielded settlement lanes — what each hides, and why both exist.
---

Midnight's ledger holds two pools of value side by side:

- the **shielded** pool — amounts and owners hidden by the Zswap protocol,
- the **unshielded** pool — transparent, like an ordinary chain.

TacitPay settles through either, with a matched pair of circuits per lane. The distinction is easiest to hold as **the envelope and the cash**:

> The invoice body — amount, memo, parties — is a **sealed envelope** in both lanes. The lane only decides whether the **cash handover** is hidden too.

## Shielded lane

`payInvoice` escrows a shielded coin; `withdraw` releases it to the issuer. The transfer itself is protected by the protocol: an observer sees that _some_ settlement happened at some time, and nothing else. Amount, payer and recipient of the coin are all hidden. This is the full private story.

## Unshielded lane

`payInvoiceUnshielded` receives transparent tokens and records the owed amount; `withdrawUnshielded` pays them out to an address the issuer chooses. The invoice contents stay exactly as private as ever — the memo, the invoice's meaning, the tags' unlinkability are untouched — but the token transfer is public, like paying a sealed-envelope invoice in cash across a counter: the amount and the addresses of the handover are visible; what it was _for_ is not.

The product says this out loud wherever it applies. On an unshielded network, the amount tooltip reads: _"Never stored on the ledger. On this network the payment transfer itself is public."_

## Why both lanes exist

On today's public testnets, **no self-shielding operation is available to end users**:

- faucets dispense unshielded funds, and the USDM bridge mints unshielded tokens;
- the wallet SDK offers no shield/convert primitive — transfers source each output from its own pool, and swaps are two-party atomic exchanges by design, so a single-sided "shielding swap" is correctly rejected by the node;
- shielded tokens are their own category, minted by contracts — the local devnet's shielded funds are a genesis artifact.

So the **Preview deployment is denominated in bridged USDM and settles through the unshielded lane — by design, not compromise**. Stablecoin invoicing with sealed contents is the honest product available on a public testnet today, and it is a product transparent chains cannot offer at all. The full shielded flow runs live on the local devnet, where genesis provides shielded funds, and both lanes are covered by the same test matrix.

## The road to fully private public settlement

The gap is closable from inside the protocol's own rules: shielded tokens are contract-minted, so a **contract-minted shielded wrapper token** — deposit unshielded USDM, receive shielded units, settle invoices with those — is the Wave 2 route to running the shielded lane on public networks. Until then, each network declares its lane in configuration, and the app routes payments and withdrawals accordingly without either party having to know the distinction exists.
