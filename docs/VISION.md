# Where the invoice goes

TacitPay's Wave 1 create form is three fields: an amount, a memo, an expiry.
That is the smallest possible surface of a much larger idea, and this page is
the idea. The arc in one sentence:

> **Wave 1 makes invoices private. Wave 2 makes them complete. Wave 3 makes
> them provable.**

Private state is the whole product. On chain there is only a commitment, a
status and an expiry; everything of commercial value lives on the two parties'
devices. That private state can grow along four axes, and each axis is a
different answer to "what does the invoice become."

## Axis 1: the invoice as a document (Wave 2)

The obvious growth, and cheap, because the on-chain commitment is
`persistentCommit(amount, memoHash, salt)`: the body is hashed, so a richer
body folds into the same commitment with no circuit change and no redeploy.

- Invoice number, issue and due dates, denomination.
- A customer record (name, contact, address): private, never on chain.
- Line items with quantity and unit price, tax and discount lines, so the
  amount becomes a computed total.
- Notes, payment terms, purchase-order reference.
- Templates and "duplicate this invoice."
- Attachments by hash (Wave 3): a contract, a delivered file. The commitment
  then binds this payment to this deliverable, so "I was paid for exactly this
  work" becomes provable without showing the work.

Two constraints shape the design. The body is hashed at creation, so it is
immutable: amendments become a new version, or a credit note that references
the original. And links have a size ceiling, so real attachments would be
encrypted blobs stored elsewhere with the key riding the link fragment; the
blob can be public because the key never is.

Spec: PRD §15.11 (invoice document v1) ships on the same `v: 2` payload bump
as secure links (§15.8), so the link schema changes once.

## Axis 2: the invoice as a relationship (Wave 2 to Wave 3)

Invoicing products win or lose here, and all of it is private state:

- **A private customer book.** Every client as a record with their invoice
  history, averages and payment behaviour. The chain never learns the book
  exists.
- **Recurring series** (PRD §15.7): retainers and subscriptions from one
  standing link, unlinkable on chain, correlated only by the seed-holders.
- **Credit notes, refunds and partial payments as records** tied to their
  invoices. (Partial payment on chain stays parked; it interacts with the
  commitment scheme. Recording it privately is easy.)
- **The payer side, mirrored.** A private vendor book, receipts filed by
  vendor, spend by period. Payers are a first-class user and today get little
  beyond a receipt list.

## Axis 3: the invoice as evidence (Wave 3, the moat)

Private state is not storage. It is **witness data for proofs**. Once the
records are rich, facts about them can be proven without revealing them:

- "I received at least X between these dates" (revenue proof, PRD §16.1).
- "At least X is outstanding from customers" (receivables proof, §16.4).
- "This customer has paid N invoices, all on time": a private credit reference
  a client can hand a landlord or a lender.
- "This specific invoice was paid by me": the payer's receipt proof.
- Eventually, "I am a registered business," by credential, without saying
  which.

No transparent ledger can offer this, and no plain private rail can either. It
exists only because the invoices are private _and_ anchored. That is the
sentence that separates TacitPay from both: the chain is the neutral witness,
and the witness has learned nothing it could repeat.

## Axis 4: the invoice as workflow (Wave 2)

Milestone release, claim-based refunds, a timeout escape hatch, disputes
without an arbitrator (PRD §15.5, §15.6). Private state carries approvals and
release conditions; the contract enforces the money. Money can never get stuck,
and no platform sits in the middle.

## How the axes map to the waves

| Wave | Theme                   | Axes advanced                                        |
| ---- | ----------------------- | ---------------------------------------------------- |
| 1    | The loop works          | The minimal document; the private lifecycle          |
| 2    | The product completes   | Document v1, workflow, relationships (series)        |
| 3    | Prove it to the auditor | Evidence; the rest of the document; the payer's book |

What is deliberately not on any axis (cards, gift instruments, oracle
conversion, custodial checkout, an in-app assistant, a merchant super-app) is
recorded in [`AUDIT-RESPONSE.md`](./AUDIT-RESPONSE.md). The wave scopes
themselves are law in [`PRD.md`](./PRD.md) §14; this page is the reason they
add up.
