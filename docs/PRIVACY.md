# Privacy model

Condensed from PRD §4 — the full expansion (who-sees-what tables, trust
assumptions, limitations) is a Wave 1 Day-13 deliverable. The invariants below
are binding on every circuit and ledger field from day one.

## Privacy invariants (each gets a test — PRD §4.4 / §11.4)

- **INV-1** — No ledger field ever contains an invoice amount in plaintext,
  except the Variant A escrow entry, which must be removed on withdrawal.
- **INV-2** — No ledger field contains a merchant public key or any value equal
  across two invoices of the same merchant.
- **INV-3** — A payer's wallet address / coin public key never appears in
  contract state.
- **INV-4** — Memo text never leaves the client; only `memoHash = sha256(memoText)`
  is committed.
- **INV-5** — Paying requires the invoice preimage _and_ an actual shielded coin
  of the right value and colour in the same transaction.
- **INV-6** — Only the holder of the merchant secret for that invoice can
  withdraw or cancel.
- **INV-7** — An invoice can be paid at most once.
- **INV-8** — Expired invoices cannot be paid.

## Allowed-public list

The only values that may ever be `disclose()`d are enumerated in PRD §4.3
(invoiceId, commitment, tags, status/expiry, token colour, global counters,
coin info required by the runtime, Wave 3 audit claims). If the compiler demands
`disclose()` on anything else, the design is wrong — redesign, don't disclose.
