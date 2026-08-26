---
title: The contract
description: The six circuits of tacitpay.compact — every assert, every disclosure, and the state they act on.
---

The whole protocol is one Compact contract of roughly 260 lines: `contracts/tacitpay.compact`. This page is its reference, kept in the contract's own vocabulary.

## Public state

```text
sealed ledger paymentToken: Bytes<32>            // fixed in the constructor
ledger invoices:      Map<Bytes<32>, InvoiceRecord>
ledger escrow:        Map<Bytes<32>, QualifiedShieldedCoinInfo>  // shielded lane custody
ledger unshieldedOwed: Map<Bytes<32>, Uint<128>>                 // unshielded lane custody
ledger invoiceCount:  Counter
ledger paidCount:     Counter
```

```text
InvoiceRecord {
  ownerTag:   Bytes<32>   // hash(merchantPubKey, invoiceId)
  commitment: Bytes<32>   // persistentCommit({ amount, memoHash }, salt)
  status:     OPEN | PAID | WITHDRAWN | CANCELLED
  expiresAt:  Uint<64>    // unix seconds; 0 = never
  payerTag:   Bytes<32>   // zero until paid
}
```

Two witnesses supply private inputs from the device: `merchantSecret()` and `payerSecret()`. Role keys are derived with domain separation (`tacitpay:merchant:` / `tacitpay:payer:`), and each on-chain tag hashes the role key **with the invoice ID**, so tags are unlinkable across invoices.

## The circuits

### `createInvoice(invoiceId, amount, memoHash, salt, expiresAt)`

| Asserts            | Discloses                                  |
| ------------------ | ------------------------------------------ |
| `invoiceId` unused | invoice ID, owner tag, expiry, commitment¹ |
| `amount > 0`       |                                            |

Stores the record with status OPEN. The amount, memo hash and salt are never disclosed — only their commitment is stored, and `persistentCommit` is hiding, so it may be stored without disclosure.

### `payInvoice(invoiceId, amount, memoHash, salt, coin)` — shielded lane

| Asserts                                              | Discloses                        |
| ---------------------------------------------------- | -------------------------------- |
| invoice exists and is OPEN                           | payer tag, status, escrowed coin |
| not expired (`expiresAt == 0` means never)           |                                  |
| `commit({amount, memoHash}, salt) == inv.commitment` |                                  |
| `coin.color == paymentToken`, `coin.value == amount` |                                  |

The commitment check is the payer's proof of knowing the invoice's contents, verified in zero knowledge. The coin is received into contract custody (`receiveShielded`) and parked in the escrow map — Variant A custody, chosen because a shielded send to a key other than the transaction creator would not notify that user's wallet.

### `payInvoiceUnshielded(invoiceId, amount, memoHash, salt)` — unshielded lane

Same validation chain as `payInvoice` — existence, OPEN, expiry, the commitment preimage — then `receiveUnshielded(paymentToken, amount)` and a public entry in `unshieldedOwed`. The amount in that map is public: an unshielded payment discloses its amount by nature, and the contract does not pretend otherwise.

### `withdraw(invoiceId)` — shielded lane

| Asserts                                                               | Discloses |
| --------------------------------------------------------------------- | --------- |
| invoice exists and is PAID                                            | status    |
| `escrow.member(id)` — else "Paid unshielded - use withdrawUnshielded" |           |
| caller's secret re-derives the stored `ownerTag`                      |           |

Sends the escrowed coin to the caller and marks WITHDRAWN. Ownership is proven from the witness secret, never from `ownPublicKey()` — which is prover-supplied and therefore not an authorization check.

### `withdrawUnshielded(invoiceId, to)` — unshielded lane

Mirror of `withdraw` with the opposite lane guard ("Paid shielded - use withdraw") and one extra power: the issuer names the payout address (`to`), so unshielded proceeds can land wherever the issuer chooses — a fresh address, cold storage, anywhere.

### `cancelInvoice(invoiceId)`

Only OPEN invoices; same ownership proof as withdrawal; marks CANCELLED. A PAID invoice cannot be cancelled — the payer's funds can only ever move forward to the issuer's withdrawal.

---

¹ Disclosure here means "written to public state". The full allowed-public list is deliberately short: IDs, tags, commitments, statuses, expiries, counters — and on the unshielded lane, the settled amount. Everything else in every circuit stays inside the proof.
