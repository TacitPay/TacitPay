---
title: Invoice lifecycle
description: The four statuses an invoice can hold, and the circuit that moves it between them.
---

An invoice's status is one of the few things the ledger publishes — that is the "provable on demand" half of the design. The state machine is small on purpose:

<img class="tp-img-light" src="/diagrams/tacitpay-invoice-lifecycle.png" alt="Invoice lifecycle: createInvoice opens the invoice; payInvoice moves it to PAID; withdraw moves it to WITHDRAWN; cancelInvoice moves an open invoice to CANCELLED." />
<img class="tp-img-dark" src="/diagrams/tacitpay-invoice-lifecycle-dark.png" alt="Invoice lifecycle: createInvoice opens the invoice; payInvoice moves it to PAID; withdraw moves it to WITHDRAWN; cancelInvoice moves an open invoice to CANCELLED." />

## The transitions

| From | To        | Circuit                                | Guarded by                                                              |
| ---- | --------- | -------------------------------------- | ----------------------------------------------------------------------- |
| —    | OPEN      | `createInvoice`                        | ID unused; amount > 0                                                   |
| OPEN | PAID      | `payInvoice` or `payInvoiceUnshielded` | Not expired; payer knows the commitment preimage; token and value match |
| OPEN | CANCELLED | `cancelInvoice`                        | Caller's secret derives the stored owner tag                            |
| PAID | WITHDRAWN | `withdraw` or `withdrawUnshielded`     | Same ownership proof; the lane must match how it was paid               |

Terminal states are terminal: a WITHDRAWN or CANCELLED invoice never moves again, and a PAID invoice cannot be cancelled — the funds sit in the contract until the issuer withdraws them.

## Expiry

`expiresAt` is unix seconds, with `0` meaning "never expires". Both payment circuits assert the block time is still before it. Expiry does not change the stored status by itself — an expired OPEN invoice simply can no longer be paid, and its issuer can still cancel it.

## Escrow, not direct transfer

Payment does not send funds to the issuer directly. The contract takes custody — a shielded coin into the escrow map, or unshielded tokens against a recorded owed amount — and the issuer collects with an explicit withdrawal, proving ownership at that moment. This is what makes the settlement fact public and checkable while the parties stay unnamed: value moved party → contract → party, and only the contract's side of each hop names anyone.

Each lane guards the other's exit: `withdraw` refuses an invoice paid unshielded ("use withdrawUnshielded") and vice versa, so funds can never be claimed through the wrong door.
