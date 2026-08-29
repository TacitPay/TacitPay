# Demo talk track: what to say

The spoken script for the Wave 1 video, start to finish. Target runtime 4:45,
hard cap 5:00. Rules for the take (never say "anonymous", don't narrate clicks,
let proofs run, no music) live in [`DEMO-SCRIPT.md`](./DEMO-SCRIPT.md). The
deck is `docs/deck/demo.html`.

Bold phrases carry the claims: keep those exact. Everything else is yours to
bend. Lines in _italics_ are cues, not speech.

---

## Slide 1: the app (0:00)

_Slide 1 full-screen. Speak over it, then advance._

This is TacitPay: private invoicing and settlement on Midnight.

One party issues an invoice, the other settles it on-chain, and anyone can
verify the payment happened **without ever learning what it was for**. Private
by default, provable on demand.

## Slide 2: the problem (0:20)

_Slide 2. Land it slowly; this is the whole pitch._

Today, paying or getting paid in crypto gives you two bad options. And only two.

Invoice on a transparent chain, and every payment publishes who paid whom, and
how much. Fresh addresses don't help: clustering stitches your history back
together. **Your rate card to your competitors, your client list to anyone who
looks.**

Or invoice on private rails, and now your only proof of payment is **the other
side's paperwork**. A receipt can be refused, disputed, or faked by the two
people who wrote it. That's why auditors ask for bank statements, not receipts:
paperwork asserts, rails witness.

Real businesses need both at once: privacy from the world, proof on demand.

## Slide 3: three promises (0:50)

_Slide 3, the three cards. One sentence each, gesturing left to right._

The chain is the bank statement: a neutral witness neither party controls.
Today's problem is that everyone can read it. **TacitPay keeps the witness and
drops the readability.** Three promises.

Invoices are **private by construction**: the chain holds a commitment, never
the contents. Settlement is **provable by anyone**: no wallet, no account, no
permission. And there is **no server to trust**: the invoice travels as a link,
and TacitPay couldn't read it if we wanted to.

## Slide 4: the machinery (1:10)

_Slide 4, the architecture. Four numbered zones: top band, middle-left,
middle-right, bottom band. Point at each number as you reach it._

And here's the machinery behind those promises: four pieces, numbered on the
diagram.

One, the link is the transport. The invoice itself never touches a server. It
travels as a link, and everything after the hash mark is the invoice body:
amount, memo, salt. **Browsers never transmit a fragment**: no server, no logs,
no referer. It's exactly nine fields, strictly validated, because it parses
untrusted input.

Two, every caller funnels through one door. The web app, the CLI, and in Wave 2
an SDK and an MCP server for software agents, all call one API package. It is
**the only place circuits are ever invoked**: one door, one disclosure path,
one audit surface.

Below it, proving. Proofs are generated in your wallet, by a local prover, or on
a server you run, in that order of trust. **TacitPay never operates a prover**,
because whoever generates a proof sees the invoice.

Three, six providers, two worlds. Beside it, the six pieces Midnight needs every dApp to plug in. The indexer reads public state. The compiled keys and circuits are served as static files. Your wallet balances the transaction and submits it to the Midnight node, and the indexer follows the node's blocks. And private state, your invoice records, sits encrypted on your own device, never transmitted. That's the two worlds: **public facts travel through the indexer and the node; private records and the proof never leave your device or your wallet.** The only thing that crosses between them is the commitment.

Four, what actually lands on-chain. A four-circuit Compact contract. Per
invoice, the public ledger holds an owner tag, a hiding commitment, a status
flag, and an expiry. **The amount, the memo, the parties: on chain only inside
that commitment.** Anyone can verify an invoice settled. Nobody can read what it
was for.

_Optional cut if the take runs long: the proving paragraph can move to the
Settings moment in the demo._

---

## Demo: live, end to end (2:10)

### Landing page (2:10)

_tacitpay.xyz. One line, then click through to the docs._

Enough slides. This is live on Midnight's Preview testnet.

### Docs (2:15)

_docs.tacitpay.xyz. Scroll once through the sidebar, don't stop._

Everything I'm about to show is documented: the whitepaper, the privacy model
with its tested invariants, guides for every flow. I'll leave it for the judges
and go to the app.

### Connect (2:25)

_app.tacitpay.xyz, merchant profile, wallet already connected. Gesture at the
header chips: network, proving, wallet._

The wallet is the account. No signup, no server-side profile. The header says
which network I'm on and where my proofs will be generated: in this case, a
prover on my own machine.

_If the unlock form is on screen:_ A passphrase seals my records on this
device. TacitPay has no server that could hold them.

### Create (2:35)

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

### The link (3:00)

_Invoice ready. Point at the sentence under the copy buttons, copy the link._

The link **is** the invoice, and the app says the quiet part out loud: anyone
holding it can read it and pay it. So it travels like a real invoice should:
directly to my client, over a channel we trust.

### Pay (3:10)

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

### Verify (3:40)

_Verification page, ideally a third context with no wallet at all. Paste the
invoice ID._

This is the third party's view: no wallet connected, no permission asked. Paste
the invoice ID: **paid**. Settlement is provable to anyone: an accountant, a
counterparty, a court.

_Optional, the money shot: flip to the explorer tab on the contract and search
the page for the invoice amount._ And that's the entire public record. Search
it for the amount. It isn't there.

### Withdraw (3:55)

_Back in the merchant profile. Open the invoice, withdraw. Have the wallet
balance visible before and after._

Back as the merchant: withdraw. Watch the balance, not just the badge. **The
status flip proves state changed; the balance proves value moved.** That's the
difference between a demo and a working system.

### The limitation (4:10)

_Stay on the app. Say it unprompted, calmly._

One honest limitation. On today's public testnets the payment transfer itself is
public: payer address and amount ride the open token flow. The invoice's
contents never touch the ledger either way. The fully shielded flow already runs on our local devnet. On public networks, the missing piece is a wallet-side shielding step, and Midnight's own engineers have confirmed it is a fixed-but-unreleased SDK gap, not a protocol limit. **Wave 2 turns it on.**

---

## Slide 5: Wave 2 (4:15)

_Slide 5, the roadmap. One breath per item, no detail; the slide carries the
specifics._

Wave 2, in the order the product completes.

Shielded settlement on public networks, which turns on that greyed Private card. Funds safety:
milestone escrow, refunds, a timeout escape hatch. Gasless first payments with
sponsored DUST. Real invoice documents, hardened links, encrypted backup. And then the SDK and the MCP
server, **so software agents can invoice the way people do**.

## Slide 6: end card (4:35)

_Slide 6. Hold it five full seconds after the last line._

TacitPay. Private by default, provable on demand. Thanks for watching.
