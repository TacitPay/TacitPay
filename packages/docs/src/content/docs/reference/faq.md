---
title: FAQ & limitations
description: Straight answers, including the ones that admit a limit. Every limitation here is stated in the product and pinned by a test where possible.
---

Privacy products earn trust by what they admit. Everything below is stated in the repository openly — several limits are pinned by tests so they cannot silently regress.

## Can anyone see what I charged?

No. The amount and memo never reach the ledger — only a hiding commitment does. On the **unshielded lane** the settlement _transfer_ is public, so the amount paid is visible there as a property of the transfer; the memo, the invoice's meaning and the tags' unlinkability are untouched. On the shielded lane the transfer is hidden too. See [Settlement lanes](/concepts/lanes/).

## Can my invoices be linked together?

Not from the chain. Every invoice carries fresh tags — a hash of a role key _with that invoice's ID_ — so two invoices from the same issuer look unrelated on the ledger.

## What does an observer actually learn?

That some invoice was created, and later that some invoice was paid at time T. Timing is correlatable; contents and parties are not (shielded lane), and contents are not (unshielded lane). Anonymity sets are small on a young network — inherent to any new chain, and worth saying out loud.

## Who learns who paid?

Whoever issued the invoice — off-chain, because they sent the payer the link. That is normal commerce, not a chain leak. The chain itself does not connect the payer to the invoice beyond an unlinkable tag.

## What if I lose my passphrase?

The chain still proves your invoices existed and were settled — but the amounts, memos and salts encrypted in your browser are gone. The passphrase never leaves your device and is deliberately never stored, so there is no recovery. Export/import of private state is the Wave 2 mitigation.

## Is the escrow private while it holds funds?

Not fully — stated openly: the shielded escrow's coin nonce is public while the contract holds it, so an observer who guesses the issuer's Zswap key can confirm it against a later withdrawal and link that issuer's withdrawals. A test pins this behaviour so it stays a **tested limitation** rather than an assumption. Wave 2's Variant B escrow removes the exposure.

## Why doesn't Preview settle shielded?

Because no supported end-user shield path exists on Preview today: faucets and the bridge dispense unshielded funds, Lace has no shield control, and the Wallet SDK's shielding swap is broken on stable releases through 1.2.0 (Midnight core engineering confirmed this on Aug 29, 2026; the fix is merged upstream and unreleased). Preview therefore settles bridged USDM through the unshielded lane; the full shielded flow runs on the local devnet, and a contract-minted shielded wrapper is the Wave 2 route. The Midnight community confirmed the framing when we asked: tNIGHT is unshielded by nature, and a dApp's zero-knowledge side runs on DUST, not on shielded value. The whole story: [Settlement lanes](/concepts/lanes/); the token model itself: the [Midnight Academy](https://academy.midnight.network/).

## Is TacitPay a company holding my money?

No. Funds move payer → contract → issuer, authorized only by proofs from device-held secrets. There is no server in the payment path, no operator prover, and no keys held on anyone's behalf — see [What TacitPay cannot see](/concepts/cannot-see/).

## Can software use this, not just people?

Yes — that is the design. Every circuit call goes through one client library; the app and CLI are just callers. A Node SDK and an MCP server (so agents can issue and settle invoices the way a person does) arrive in Wave 2.
