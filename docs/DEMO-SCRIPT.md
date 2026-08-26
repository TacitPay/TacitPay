# Demo video script (Wave 1)

3–5 minutes, one take, no music over narration (PRD §17.3). Record on Day 14;
re-record if any step fails.

**Before recording**, have all of this already true, because none of it is
interesting to watch:

- `yarn env:up` green, or a funded Lace/1AM wallet on Preview. The **payer
  wallet must hold shielded tNIGHT** — faucet funds are transparent and cannot
  pay an invoice; shield a few hundred before recording.
- `yarn demo:seed` already run once, so the sandbox exists and the second run
  is instant. Keep the printed contract address and invoice ids on a notepad.
- Two browser profiles open — merchant and payer — so the payer genuinely
  cannot see the merchant's private state. This is the single most convincing
  thing in the video; do not fake it with one profile.
- A block explorer tab already at the contract address — live:
  <https://preview.midnightexplorer.com/contracts/1f37835dd1f3ba29cfa912385ff6f0059f66aad9cad6b5dc8686b8a3e21bc547>.
- Terminal font large enough to read at 720p.

---

## Beats

| Time | Beat                                                                                                                                                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00 | **The problem, in one sentence.** "If you invoice on a public chain, everyone learns what you charge and who pays you. If you invoice privately, nobody can prove you were paid." Say it over the marketing page at `/`, then stop talking about the problem. |
| 0:30 | **Create.** `/merchant` → create an invoice with a real amount and a memo. While the proof runs, say what is happening: the amount and memo never leave this browser; what goes on chain is a commitment. Copy the link.                                      |
| 1:05 | **Show the ledger.** Explorer tab, the contract state. Point at the commitment. Say plainly: "that is the whole record — a hash, a status flag and an expiry." Search the page for the amount; find nothing. This is the money shot, so hold it.              |
| 1:35 | **Pay.** Paste the link into the _payer_ profile. Point out that the payload is after the `#`, so no server ever received it. Connect the wallet, pay, show the proof stepper moving through its real stages.                                                 |
| 2:20 | **Verify.** `/verify/<id>` with no wallet connected at all — a third party can confirm settlement. PAID. Then back to the explorer: still no amount anywhere.                                                                                                 |
| 2:45 | **Withdraw.** Merchant profile → withdraw. Show the wallet balance before and after. The status flip proves state changed; the balance proves value moved. Say that distinction out loud — it is the difference between a demo and a working system.          |
| 3:15 | **Say the limitation.** One sentence, unprompted: while the contract escrows the coin, its value is public until withdrawal, and Variant B closes that in Wave 2. Volunteering this buys more credibility than hiding it costs.                               |
| 3:30 | **Tests.** `yarn test` scrolling. Name the number. Mention U-17 specifically: it serialises the ledger and asserts the amount is absent in four encodings.                                                                                                    |
| 3:50 | **Proving tiers, briefly.** `/settings`. "Whoever generates the proof sees the invoice, so TacitPay never runs a prover. Your wallet, your machine, or your server."                                                                                          |
| 4:10 | **Roadmap slide.** Wave 2: Variant B escrow, milestone escrow, refunds, recurring invoices, the MCP server. One breath, no detail.                                                                                                                            |
| 4:25 | **End card.** Repo URL, contract address, Discord handle. Leave it on screen for five full seconds.                                                                                                                                                           |

---

## Rules for the take

- **Never say "anonymous."** The word is wrong and a judge will catch it —
  parties are unlinkable per invoice, not anonymous. PRD §9.4 bans it in the UI
  for the same reason.
- **Do not narrate the UI.** "Now I click create" is dead air. Say what is true
  underneath while the click happens.
- **Let the proof take as long as it takes.** Cutting the wait implies you are
  hiding it. If it is genuinely slow, say the number out loud.
- **If a step fails, stop and re-record.** A recovered mistake reads as a
  fragile system even when it is not.
- **No music over narration.** PRD §17.3, and it is the right call anyway.
