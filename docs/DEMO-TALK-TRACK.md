# Demo talk track: what to say

The spoken script for the Wave 1 video, start to finish. Target runtime about 3:35 (slides in the first minute), hard cap 5:00. Rules for the take (never say "anonymous", don't narrate clicks,
let proofs run, no music) live in [`DEMO-SCRIPT.md`](./DEMO-SCRIPT.md). The
deck is `docs/deck/demo.html`.

Bold phrases carry the claims: keep those exact. Everything else is yours to
bend. Lines in _italics_ are cues, not speech.

---

## Slide 1: the app (0:00, about 10 seconds)

_Slide 1 full-screen. Speak over it, then advance._

This is TacitPay: private invoicing on Midnight. You get paid on-chain, anyone
can verify it, and **nobody sees what it was for**.

## Slide 2: the problem (0:10, about 20 seconds)

_Slide 2. The cards carry the detail; you carry the point._

Today, paying or getting paid in crypto gives you two bad options.

On a transparent chain, every payment shows who paid whom, and how much: **your
prices and your clients, for anyone to see.**

On private rails, the only proof you were paid is **the other side's word.**

Businesses need both: privacy, and proof.

## Slide 3: the solution (0:30, about 12 seconds)

_Slide 3, the three cards, left to right._

TacitPay does both. The invoice stays private: **the chain only holds a
commitment.** Payment is **provable by anyone**, no wallet needed. And there is
**no server**: the invoice travels as a link.

## Slide 4: how it works (0:42, about 18 seconds)

_Slide 4, the architecture. Point at the four numbers as you name them. Stay
high level; the in-depth version is in the docs._

Under the hood, in plain terms. One: the invoice travels as a link, never
through a server. Two: every part of the app talks to the chain through **one
door**. Three: your wallet and your private records **stay on your device**.
Four: the chain only ever sees a commitment, a status, and an expiry.

The full architecture is in our docs; I won't go deeper here.

---

## Demo: live, end to end (1:00)

### Landing page (1:00)

_tacitpay.xyz. One line, then click through to the docs._

Enough slides. This is live on Midnight's Preview testnet.

### Docs (1:05)

_docs.tacitpay.xyz. Scroll once through the sidebar, don't stop._

Everything I'm about to show is documented: the whitepaper, the privacy model
with its tested invariants, guides for every flow. I'll leave it for the judges
and go to the app.

### Connect (1:15)

_app.tacitpay.xyz, merchant profile, wallet already connected. Gesture at the
header chips: network, proving, wallet._

The wallet is the account. No signup, no server-side profile. The header says
which network I'm on and where my proofs will be generated: in this case, a
prover on my own machine.

_If the unlock form is on screen:_ A passphrase seals my records on this
device. TacitPay has no server that could hold them.

### Create (1:25)

_Invoices, New invoice. A real amount (3 tUSDM) and a real memo. Pause one beat
on the Settlement pair before creating._

A real invoice: three tUSDM, and a memo my client will read but the chain never
will.

Settlement is public on today's testnet, and the Private lane is already in the
product, greyed, coming in Wave 2. **A control that doesn't work yet should look
like it doesn't work yet.**

_While the proof stepper runs. Do not fill the silence with clicks._

What's happening now: the amount and memo **never leave this browser**. My
wallet is building a commitment, a hash, and a zero-knowledge proof that it's
well-formed, then putting only those on chain.

### The link (1:50)

_Invoice ready. Point at the sentence under the copy buttons, copy the link._

The link **is** the invoice, and the app says the quiet part out loud: anyone
holding it can read it and pay it. So it travels like a real invoice should:
directly to my client, over a channel we trust.

### Pay (2:00)

_Switch to the payer browser profile. Paste the link on /pay. Let the summary
render, point at the fragment in the URL bar._

Now I'm the client: different browser profile, different wallet. The invoice
body sits after the hash in this URL, so **no server ever received it**. The
page reads the public status straight from the chain: open, unpaid.

_Click Pay. Over the proof stages:_

These stages are real: building, proving, balancing fees, submitting, waiting
for the chain to confirm. On an unshielded testnet the transfer itself is
public, **like cash handed over for a sealed envelope**. The envelope stays
sealed.

### Verify (2:30)

_Verification page, ideally a third context with no wallet at all. Paste the
invoice ID._

This is the third party's view: no wallet connected, no permission asked. Paste
the invoice ID: **paid**. Settlement is provable to anyone: an accountant, a
counterparty, a court.

_Optional, the money shot: flip to the explorer tab on the contract and search
the page for the invoice amount._ And that's the entire public record. Search
it for the amount. It isn't there.

### Withdraw (2:45)

_Back in the merchant profile. Open the invoice, withdraw. Have the wallet
balance visible before and after._

Back as the merchant: withdraw. Watch the balance, not just the badge. **The
status flip proves state changed; the balance proves value moved.** That's the
difference between a demo and a working system.

### The limitation (3:00)

_Stay on the app. Say it unprompted, calmly._

One honest limitation. On today's public testnets the payment transfer itself is
public: payer address and amount ride the open token flow. The invoice's
contents never touch the ledger either way. The fully shielded flow already runs on our local devnet. On public networks, the missing piece is a wallet-side shielding step, and Midnight's own engineers have confirmed it is a fixed-but-unreleased SDK gap, not a protocol limit. **Wave 2 turns it on.**

---

## Slide 5: Wave 2 (3:05)

_Slide 5, the roadmap. One breath per item, no detail; the slide carries the
specifics._

Wave 2, in the order the product completes.

Shielded settlement on public networks, which turns on that greyed Private card. Funds safety:
milestone escrow, refunds, a timeout escape hatch. Gasless first payments with
sponsored DUST. Real invoice documents, hardened links, encrypted backup. And then the SDK and the MCP
server, **so software agents can invoice the way people do**.

## Slide 6: end card (3:25)

_Slide 6. Hold it five full seconds after the last line._

TacitPay. Private by default, provable on demand. Thanks for watching.
