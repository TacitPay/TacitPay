---
title: The disclosure line
description: Exactly which invoice fields cross onto the public ledger, and which are never sent at all.
---

Every field of a TacitPay invoice has one of two destinies: it crosses onto the public ledger, or it never leaves your device. There is no third state — nothing is "encrypted on chain, waiting for a key". What the chain does not receive, it does not hold.

## What the chain holds

| Field        | On the ledger | Notes                                                      |
| ------------ | ------------- | ---------------------------------------------------------- |
| `invoice_id` | **Yes**       | Chosen at creation; random 32 bytes                        |
| `status`     | **Yes**       | OPEN → PAID → WITHDRAWN, or OPEN → CANCELLED               |
| `expires_at` | **Yes**       | Unix seconds; `0` means never                              |
| `commitment` | **Yes**       | `persistentCommit({ amount, memoHash }, salt)` — hiding    |
| `owner_tag`  | **Yes**       | `hash(merchantPubKey, invoiceId)` — unlinkable per invoice |
| `payer_tag`  | **Yes**       | Same construction for the payer; zero until paid           |
| `amount`     | **Never**¹    | Lives in the commitment's preimage, on your device         |
| `memo`       | **Never**     | Only its hash is inside the commitment                     |
| `merchant`   | **Never**     | The tag reveals nothing about the key behind it            |
| `payer`      | **Never**     | Likewise                                                   |

¹ On the [unshielded settlement lane](/concepts/lanes/), the payment _transfer_ itself is public, so the settled amount is visible there — as a property of the transfer, not of the invoice record.

## Who sees what

The four layers data lives in, and which party can read each:

<img class="tp-img-light" src="/diagrams/tacitpay-privacy-map.png" alt="Who sees what: the public ledger holds tags, commitments and statuses; the shielded ledger holds the payment coin; each party's device holds the invoice bodies and secrets; the link fragment carries the payload between parties." />
<img class="tp-img-dark" src="/diagrams/tacitpay-privacy-map-dark.png" alt="Who sees what: the public ledger holds tags, commitments and statuses; the shielded ledger holds the payment coin; each party's device holds the invoice bodies and secrets; the link fragment carries the payload between parties." />

## The commitment

At creation, the client computes:

```text
commitment = persistentCommit({ amount, memoHash }, salt)
```

`persistentCommit` is hiding: the ledger stores the commitment, and nothing about the amount or memo can be recovered from it. The salt is random per invoice, so two invoices for the same amount and memo still carry unrelated commitments.

Paying requires presenting the same `amount`, `memoHash` and `salt` — carried to the payer inside the [invoice link](/concepts/links/). The circuit recomputes the commitment in zero knowledge and asserts it matches. The payer proves they know exactly what they are paying for; the chain never learns it.

## The tags

Party identity works the same way in both roles:

```text
merchantPubKey = hash("tacitpay:merchant:", secret)
ownerTag       = hash(merchantPubKey, invoiceId)
```

Two properties matter:

- **Unlinkability.** The tag mixes in the invoice ID, so two invoices from the same issuer carry unrelated tags. Reading the ledger cannot cluster an issuer's invoices or a payer's payments.
- **Real authorization.** Withdrawing or cancelling requires re-deriving the stored tag from the witness secret inside the circuit. It is never proven from `ownPublicKey()`, which is prover-supplied and therefore not an authorization check — anyone could claim any key.

The domain separators (`tacitpay:merchant:` / `tacitpay:payer:`) keep the two key spaces disjoint: a merchant secret can never masquerade as a payer key or vice versa.
