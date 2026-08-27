# Privacy model

**As of 2026-08-24.** Expanded from PRD §4. Every claim here points at the
file, circuit or test that proves it — treat the code as the authority. If this
document and the repository disagree, the repository is right.

Line numbers below are correct at the commit that last touched this file and
will drift as the code moves. The **test identifiers** — `U-01` … `U-28` — are
stable and greppable; use those if a line number does not land where it says.

Related: [`../PRD.md`](../PRD.md) §4 is the source of truth for intent,
[`ARCHITECTURE.md`](./ARCHITECTURE.md) explains where each piece of state
lives, and [`../currentstate.md`](../currentstate.md) §6 is the short version of
the limitations below.

---

## 1. The claim

An observer with full access to the Midnight ledger, the indexer and every
transaction ever submitted can tell you that invoice `0x11…` exists, that it
was created at block _N_, paid at block _M_, and withdrawn at block _P_. They
cannot tell you what it was for, how much it was, who issued it, or who paid
it. All they hold is a hiding commitment over `{amount, memoHash}` and two
per-invoice hash tags that are different for every invoice — including two
invoices from the same merchant. Anyone can therefore verify that a specific
invoice was settled without learning a single fact about the trade behind it.
The one hole in that claim is the Wave 1 escrow: between `payInvoice` and
`withdraw` the contract publicly holds the coin, which publishes the amount for
that window and permanently weakens the merchant's unlinkability. That is
§6.1 below, and it is the reason Variant B exists.

---

## 2. Who sees what

Cells are what each actor learns **from the system**, not what they learn by
being told. "Off-chain" means the actor knows it because a human sent them a
link, not because anything on the chain says so.

| Actor                                                 | Amount                                            | Memo                                 | Merchant identity                                 | Payer identity                                    | Invoice exists            | Invoice status            | Payment timing                          |
| ----------------------------------------------------- | ------------------------------------------------- | ------------------------------------ | ------------------------------------------------- | ------------------------------------------------- | ------------------------- | ------------------------- | --------------------------------------- |
| **Public chain / indexer** (anyone querying)          | **No** — commitment only. **Yes while escrowed.** | No — hash only, inside a commitment  | No — per-invoice `ownerTag`. **Weakened by §6.1** | No — per-invoice `payerTag`; the coin is shielded | **Yes** — by design       | **Yes** — by design       | **Yes** — block time of each call       |
| **Indexer operator** (additionally, as a service)     | As above                                          | As above                             | As above                                          | Learns the querying IP, not a chain identity      | Yes                       | Yes                       | Yes, plus when you asked                |
| **Merchant**                                          | Yes — they set it                                 | Yes — they wrote it                  | Themselves                                        | Off-chain only — whoever they sent the link to    | Yes                       | Yes                       | Yes                                     |
| **Payer**                                             | Yes — from the link                               | Yes — from the link                  | Off-chain only — whoever sent them the link       | Themselves                                        | Yes                       | Yes                       | Yes                                     |
| **Prover, tier 1 — in the wallet** (1AM, WASM)        | Yes                                               | No — receives `memoHash`             | Yes — holds the merchant secret for that call     | Yes — holds the payer secret for that call        | Yes                       | Yes                       | Yes                                     |
| **Prover, tier 2 — local proof server** (`:6300`)     | Yes                                               | No — receives `memoHash`             | Yes — same secret, same machine                   | Yes — same secret, same machine                   | Yes                       | Yes                       | Yes                                     |
| **Prover, tier 3 — remote, user-operated**            | Yes — leaves the device over TLS                  | No — receives `memoHash`             | Yes — the secret leaves the device                | Yes — the secret leaves the device                | Yes                       | Yes                       | Yes                                     |
| **Passive network observer** (on the payer's wire)    | No — TLS                                          | No — the fragment never leaves       | No                                                | Learns an IP used TacitPay, nothing chain-side    | Only by querying publicly | Only by querying publicly | Yes — traffic timing correlates         |
| **The static host serving the app**                   | No                                                | No — the fragment is never requested | No                                                | Learns an IP loaded a TacitPay page               | No                        | No                        | Learns page-load time, not payment time |
| **A block explorer, only if the user clicks through** | No                                                | No                                   | No                                                | Learns an IP and a txId                           | No                        | No                        | Learns when the link was clicked        |

There is no third-party CDN row, because as of 2026-08-24 the app makes no
automatic third-party request at all. Fonts are bundled from `@fontsource` and
served from the app's own origin (`packages/ui/src/index.css`,
`packages/ui/package.json`). The only external hostnames anywhere in
`packages/ui/src` are outbound links a user can choose to click — the Midnight
docs, and a block explorer on the transaction-success screen. Nothing loads on
its own. This closes what was a real limitation until that date;
[`../currentstate.md`](../currentstate.md) §6 still lists it as open and is
stale on this point.

Notes on the harder cells:

- **Amount, public chain.** `createInvoice` stores only
  `persistentCommit(InvoiceBody{amount, memoHash}, salt)`
  (`contracts/tacitpay.compact:92`). The amount itself is never disclosed. But
  `payInvoice` calls `escrow.insertCoin(id, disclose(coin), …)`
  (`contracts/tacitpay.compact:134`), and that coin's `value` is public state
  until `withdraw` removes it. See §6.1.
- **Memo, everywhere.** The circuit never receives the memo. `packages/api`
  hashes it client-side with WebCrypto SHA-256 (`packages/api/src/crypto.ts`)
  and passes only `memoHash`, which is itself an input to a hiding commitment
  and never appears alone in public state. The memo plaintext _does_ travel to
  the payer inside the link fragment — see §6.6.
- **Merchant identity, public chain.** `ownerTag` is
  `H(H("tacitpay:merchant:" ‖ sk) ‖ invoiceId)`
  (`contracts/tacitpay.compact:52–63`). Different invoice id, different tag. The
  merchant's Zswap key is a separate identity, and Variant A leaks it — §6.1.
- **Prover, all tiers.** Proving a statement about secret inputs requires
  holding those inputs. This is inherent to ZK, not a Midnight limitation. The
  tiers differ only in _where_ the prover runs; what it sees is identical.
  Tiers 1 and 2 keep it on the user's own device. **TacitPay never operates a
  prover** — decision D-010, and the reasoning is in
  [`DECISIONS.md`](./DECISIONS.md).
- **Indexer operator.** `packages/api` always fetches the whole contract state
  (`queryContractState(contractAddress)` in `packages/api/src/api.ts`) and
  filters client-side, including in `watchInvoice`. So the indexer learns that
  an IP follows contract _X_ — not which invoice that IP cares about.

---

## 3. Privacy invariants and the tests that enforce them

Binding on every circuit and ledger field. Each row names the test that would
fail if the invariant broke.

**INV-1** — No ledger field ever contains an invoice amount in plaintext,
except the Variant A escrow entry, which must be removed on withdrawal.

> `U-17` (`contracts/src/test/tacitpay.test.ts:228`) runs create → pay →
> withdraw, serialises the whole public ledger three ways, and asserts the
> amount is absent as a decimal, as big-endian hex, as little-endian hex and as
> a bare hex string. `U-17b` (`:274`) pins the exception: it asserts the amount
> **is** present between pay and withdraw and gone after, so any widening of
> that window fails a test. `U-12` (`:177`) asserts the escrow entry is removed.
> Live: `packages/api/test/lifecycle.int.test.ts:287` repeats the decimal and
> hex sweep against indexer-sourced ledger state on a real devnet.

**INV-2** — No ledger field contains a merchant public key or any value equal
across two invoices of the same merchant.

> `U-04` (`contracts/src/test/tacitpay.test.ts:91`) creates two invoices under
> one merchant secret and asserts the two `ownerTag`s differ. `U-17` asserts
> that neither root secret nor either party's Zswap coin public key appears in
> public state.
> **Partial.** The test proves tag non-equality for the contract's own fields;
> it is not an exhaustive sweep for merchant-key-shaped values, and it says
> nothing about the Zswap layer, where Variant A does leak a cross-invoice link
> (§6.1). INV-2 holds for contract state today and is not fully true of the
> system until Variant B lands.

**INV-3** — A payer's wallet address / coin public key never appears in
contract state.

> `U-17` (`contracts/src/test/tacitpay.test.ts:228`) sweeps the serialized
> public ledger for **both** parties' Zswap coin public keys —
> `PAYER_COIN_PUBLIC_KEY` and `MERCHANT_COIN_PUBLIC_KEY` — after a full
> create → pay → withdraw, and asserts neither appears.
>
> This assertion was added on 2026-08-24, after an audit of this document found
> the invariant was holding only by construction. It matters because
> `ownPublicKey()` is readable inside every circuit, so "we never write it" is
> exactly the kind of claim that needs a test rather than an argument. The only
> coin-public-key-shaped value any circuit writes is
> `right<ZswapCoinPublicKey, ContractAddress>(kernel.self())` — the contract's
> own address — and `payerTag` is a hash, not a key.
>
> **Still narrower than the invariant.** The unit sweep uses the simulator's
> fixed test keys; the live integration sweep does not yet include the payer's
> real Zswap key in its forbidden list. Widening it is a Wave 2 item.

**INV-4** — Memo text never leaves the client; only `memoHash = sha256(memoText)`
is committed.

> `U-17` (`:227`) asserts both the memo plaintext and `toHex(memoHash)` are
> absent from public state. The hash function itself is pinned by
> `packages/api/test/amount.test.ts:30` ("uses SHA-256 over the UTF-8 memo
> bytes"), which checks the known SHA-256 of `"abc"`.
> `packages/api/test/lifecycle.int.test.ts:287` forbids both the memo string and
> its hex encoding in live ledger state.
> **Read it precisely.** "Never leaves the client" means never reaches the chain
> or a server. The memo does travel merchant → payer inside the link fragment —
> that is the design, and §6.6 states its cost.

**INV-5** — Paying requires the invoice preimage _and_ an actual shielded coin
of the right value and colour in the same transaction.

> Four tests, one per failure mode. `U-05` (`:103`) is the happy path — PAID,
> escrow entry present, `payerTag` non-zero. `U-06` (`:119`) supplies a wrong
> amount preimage and gets `"Invoice details do not match"`. `U-07` (`:128`)
> supplies a correct preimage with a mismatched coin value and gets
> `"Wrong amount"`. `U-08` (`:138`) supplies the wrong token colour and gets
> `"Wrong token"`; both assert no escrow entry was created. Live: the
> integration test's Step 4 (`lifecycle.int.test.ts:256`) asserts the merchant's
> shielded NIGHT balance **increases** after withdrawal — a status flag proves
> state changed, a balance proves value moved.

**INV-6** — Only the holder of the merchant secret for that invoice can
withdraw or cancel.

> `U-13` (`:199`) calls `withdraw` with the payer's secret in the merchant
> witness slot, expects `"Not the invoice owner"`, and asserts the escrow entry
> survives. Ownership is proven from the witness secret, never from
> `ownPublicKey()` — that value is prover-supplied and so cannot authorise
> anything.
> **Partial.** `cancelInvoice` carries the byte-identical assertion
> (`contracts/tacitpay.compact:181`) but has no non-owner test of its own.
> `U-15` (`:213`) covers the owner path and `U-16` (`:220`) covers cancel on a
> PAID invoice. A `cancel`-side twin of `U-13` is worth adding.

**INV-7** — An invoice can be paid at most once.

> `U-09` (`:146`) pays, pays again, expects `"Invoice is not open"`, and asserts
> `paidCount` stayed at 1.

**INV-8** — Expired invoices cannot be paid.

> `U-10` (`:155`) sets an expiry, advances simulated block time past it, expects
> `"Invoice expired"` — then rewinds to before the deadline and pays
> successfully. The control matters: it proves expiry is what rejected the
> call, not some unrelated failure.

**INV-9** (Wave 2) — A milestone invoice's escrow cannot be withdrawn before the
payer's release approval unless the timeout has passed.

> Not implemented; no circuit exists yet. `U-20`
> (`contracts/src/test/tacitpay.test.ts:301`) is pre-registered against INV-9
> directly; `U-21`, `U-22` and `U-23` (`:302–304`) cover the rest of the
> milestone state machine. All four are visible as `todo` rows in every test run.

**INV-10** (Wave 2) — An offered refund can only be claimed by the original
payer.

> Not implemented. `U-25` (`:299`) is pre-registered against INV-10 directly;
> `U-24` (`:298`) and `U-26` (`:302`) cover the surrounding refund state
> machine.

**INV-11** (Wave 2) — No public ledger value links two invoices of the same
recurring series; child ids derive from a secret seed.

> Not implemented. Pre-registered as `U-27` in
> `packages/api/test/networks.test.ts:41` — it is an api-layer derivation test,
> not a circuit test, because series derivation adds no new circuits.

Run them:

```bash
yarn test                                              # offline, everything
TACITPAY_INT=1 yarn workspace @tacitpay/api run test   # live devnet
```

---

## 4. The allowed-public list

From PRD §4.3. These are the **only** values that may ever be `disclose()`d.
The rule is absolute: if the compiler demands `disclose()` on anything not on
this list, the design is wrong — redesign, don't disclose.

| #   | Value                                        | Why it is safe to publish                                                                                                                                          |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `invoiceId`                                  | 32 random bytes from `crypto.getRandomValues`. Carries no structure and is not derived from anything private.                                                      |
| 2   | `commitment`                                 | `persistentCommit` is _hiding_ — the output reveals nothing about `{amount, memoHash}` without the salt. Needs no `disclose()` at all.                             |
| 3   | `ownerTag`, `payerTag`                       | `persistentHash` of a secret-**derived** public key with the invoice id. Never the secret. Different per invoice, so unlinkable.                                   |
| 4   | `status`, `expiresAt`                        | Publishing them is the product. Public verifiability of settlement is the thing the design exists to provide.                                                      |
| 5   | `paymentToken`                               | Chosen at deployment and identical for every invoice on that contract. Distinguishes nobody.                                                                       |
| 6   | `invoiceCount`, `paidCount`                  | Global counters over the whole contract, never per merchant. They say how busy the contract is, not who used it.                                                   |
| 7   | Coin info for `receiveShielded`/`insertCoin` | Required by the runtime — a coin cannot be received or escrowed without it. **This is where Variant A leaks (§6.1).**                                              |
| 8   | Audit attestations (Wave 3)                  | `{auditId, kind, thresholdOrPredicate, blockTime}` — the _claim_, never the data underneath it.                                                                    |
| 9   | Milestone/refund fields (Wave 2)             | `releaseAfter`, `released`, and the `REFUNDABLE`/`REFUNDED` statuses. _That_ an invoice is gated or refunded is public by design; amounts and parties stay hidden. |

Two things follow from the list that are easy to get wrong:

- **`persistentHash` is not hiding.** Hashing a secret directly would leak it to
  anyone who can guess it. That is why every tag hashes a secret-derived public
  key, with a domain-separation prefix that keeps the merchant and payer key
  spaces disjoint (`contracts/tacitpay.compact:52–58`).
- **`persistentCommit` _is_ hiding.** That is why the commitment is stored
  without a `disclose()` call — the compiler does not ask for one.

---

## 5. Trust assumptions

The claim in §1 holds only if all of the following hold. They are listed in
rough order of how much a user can do about them.

1. **Where the prover runs.** Proving requires the witness, so the prover sees
   the amount, the memo hash and the caller's root secret. Tier 1 (in-wallet
   WASM) and tier 2 (a proof server on the same machine) keep that on the
   user's own hardware. Tier 3 sends it over TLS to a machine the user
   administers. A prover operated by anyone else — including TacitPay — would
   see every amount and counterparty, which is the trusted intermediary the
   product exists to remove. D-010 rejects that outright.
2. **The wallet.** It holds the Zswap keys, balances and submits transactions,
   and on tier 1 it does the proving. A malicious wallet extension sees
   everything the user sees. `packages/ui/src/lib/wallet.ts` treats every
   injected value as untrusted and feature-detects capabilities rather than
   assuming them, but that limits blast radius — it does not remove the trust.
3. **The browser and the device.** Private state is encrypted at rest by
   `levelPrivateStateProvider`, keyed by a password derived from a user
   passphrase via PBKDF2 and cached in memory for the session
   (`packages/api/test/browser.test.ts`). A compromised device defeats this,
   as it defeats every client-side design.
4. **ZK soundness.** The privacy claim rests on Midnight's proof system being
   zero-knowledge (proofs reveal nothing beyond the statement) and sound (a
   false statement cannot be proved). TacitPay verifies neither; it inherits
   them from the platform.
5. **The Midnight ledger and Zswap.** Shielded coin amounts and owners are
   hidden by the protocol, not by anything in this repository. The escrow
   custody design assumes Zswap does what its documentation says.
6. **The indexer's honesty about public state.** An indexer cannot fabricate
   valid state, but it can lie by omission — return stale or partial data. That
   affects _liveness_ of the verify page, not confidentiality.

---

## 6. Limitations, stated openly

None of these are hypothetical, and none are softened below.

### 6.1 Variant A escrow leaks more than the value

Wave 1 uses Variant A custody: the contract holds the paid coin between
`payInvoice` and `withdraw` (`contracts/tacitpay.compact:131–134`). This is
forced, not lazy — `sendShielded` to a key other than the transaction creator
does not notify that user's wallet, so withdrawal has to be a merchant-initiated
transaction, so something has to hold the coin in between.

The obvious cost is that the escrowed coin's `value` sits in public contract
state for that window. `U-17b` pins exactly that.

The non-obvious cost is worse. The stored `QualifiedShieldedCoinInfo` includes
the coin's **nonce**, and the nonce is public. When the merchant later
withdraws, the withdrawal creates a Zswap output whose coin commitment is
derived from that nonce together with the recipient's Zswap public key. An
observer who wants to test a guess at the merchant's Zswap key can recompute
the commitment from public data and compare it against the one on chain. A
match confirms the guess — permanently, because it is in transaction history.
From then on that merchant's withdrawals are linkable to each other.

Three things worth being precise about:

- **Withdrawing does not undo this.** `escrow.remove(id)` clears current state.
  It does not clear history, and the confirmation is derived from history.
- **It weakens INV-2 on the merchant side.** The per-invoice `ownerTag`s remain
  unlinkable. The Zswap key behind the withdrawals does not.
- **It requires a guess to test against.** This is a confirmation oracle, not a
  key extraction. It is most dangerous for a merchant whose Zswap key is already
  guessable — a public address, a key reused elsewhere.

Variant B (Wave 2, PRD §6.5) stores only `persistentHash(coin)` and derives the
nonce deterministically from the invoice salt, which closes it. Until then:
**keep Wave 1 on testnet, and sweep escrow quickly.**

### 6.2 The invoice-id namespace is unauthenticated and first-come

`createInvoice` asserts only that the id is unused
(`contracts/tacitpay.compact:87`). It does not bind the id to the merchant.
Anyone holding a link payload before the merchant's transaction lands can
create that id first under their own secret, taking the `ownerTag`. The damage
is bounded — the merchant's own client sees the transaction fail, and the
attacker gains nothing but a squatted id — but it is a real gap. Deriving ids
in-circuit from the merchant secret is a Wave 2 candidate.

### 6.3 Escrowed funds have no exit without the merchant

There is no refund circuit in Wave 1. Once an invoice is PAID, the coin sits in
escrow until the merchant calls `withdraw`. A merchant who loses their secret,
or simply never withdraws, strands the payer's money with no recovery path.
Claim-based refunds are Wave 2 (PRD §15.6). **This is why Wave 1 stays on
testnet.**

### 6.4 Payment timing is correlatable

The `payInvoice` call and the Zswap output it claims land in the same
transaction, in the same block. An observer learns "some invoice was paid at
time T". They do not learn the amount or either party. Combined with off-chain
knowledge — you know a merchant sent an invoice on Tuesday, you see one
payment on Wednesday — timing narrows the candidate set. Anonymity sets on a
new network are small, which makes this worse early on.

### 6.5 The host still sees that you loaded the page

Until 2026-08-24 this section said something worse: the app pulled fonts from
`fonts.googleapis.com`, so every visitor's browser announced its IP address and
User-Agent to Google. That is fixed — fonts are bundled from `@fontsource` and
served from the app's own origin, and no automatic third-party request remains.

What is left is smaller but real. Whoever serves the static bundle sees the
requesting IP, the User-Agent, and the route — `/pay`, `/invoices`,
`/verify/<id>`. They do **not** see the fragment: browsers never transmit it,
and never put it in a `Referer` header either. The invoice id in a `/verify/<id>`
path is the one exception, and it is public information anyway.

A user who clicks the explorer link on the success screen tells that explorer
their IP and the transaction id. That is a deliberate click, not a background
load, but it is worth knowing it is there.

### 6.6 The invoice link is a bearer credential in plaintext

The link fragment is base64url-encoded JSON (`packages/api/src/link.ts`), not
ciphertext. It contains the amount, the memo, the salt and the invoice id.
Browsers never send a fragment to a server, so it is safe in transit _over
HTTP_ — but it is only as private as the channel the merchant sends it through.
An unencrypted email, a logged chat, a screenshot in a support ticket: anyone
who reads the link learns the amount and the memo, and can pay the invoice.
Whoever pays becomes the payer of record. This is the same property a
plain-text payment link has anywhere else, and it is worth saying out loud
rather than letting "private invoicing" imply otherwise.

`decodeLink` validates the payload strictly — exact field set, canonical
`Uint<64>` decimal amount, network and contract address matched against the
running app, 4 KB memo cap, 16 KB fragment cap — because it parses
attacker-controlled input. That defends against malformed and cross-contract
payloads. It does not, and cannot, defend against a link the merchant leaked.

### 6.7 The merchant learns the payer's identity off-chain

They sent them the link. This is ordinary commerce, not a chain leak, and the
chain does not confirm it — but the merchant knows who they invoiced, and
TacitPay does not change that.
