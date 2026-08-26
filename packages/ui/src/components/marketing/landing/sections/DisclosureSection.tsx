import { MicroLabel, Reveal, SectionIntro } from '../shared';

/**
 * The line, shown as the ledger's own copy of one invoice: four fields held
 * verbatim, four represented by nothing at all.
 *
 * This chapter used to be a full-width animated corridor — eight packets, a
 * wall, a timeline. The claim survived the cut to a static card; the
 * onboarding cost of the instrument did not. What the chain holds IS the
 * argument, so the card shows exactly that and stops.
 */

const CHAIN_HOLDS = [
  { key: 'invoice_id', value: '0x8f3a…c21b' },
  { key: 'status', value: 'PAID' },
  { key: 'expires_at', value: '2026-09-30' },
  { key: 'commitment', value: '0x41d9…7e02' },
] as const;

/** Bar widths echo the length of what is being withheld, nothing more. */
const NEVER_SENT = [
  { key: 'amount', width: 76 },
  { key: 'memo', width: 104 },
  { key: 'merchant', width: 66 },
  { key: 'payer', width: 66 },
] as const;

export function DisclosureSection() {
  return (
    <section id="record" className="border-b border-tp-rule bg-tp-surface-alt">
      <div className="mx-auto max-w-[92rem] px-5 py-20 sm:px-8 md:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-20">
          <SectionIntro
            eyebrow="The line"
            title="Only the fact crosses."
            lede="The chain gets a status and a commitment. The amount, memo, and names never leave your device."
          />

          {/* The ledger's copy, verbatim. A redaction bar is not a cipher — the
              chain was never handed the value at all. The card loops through
              being written (motion/chainLedger.ts); the labels hold still
              because the ledger's structure is public either way. */}
          <Reveal className="w-full max-w-xl lg:justify-self-end">
            <div data-tp-ledger className="border-y border-tp-rule">
              <div className="flex items-center justify-between gap-4 border-b border-tp-rule py-3">
                <MicroLabel className="text-tp-ink">What the chain holds</MicroLabel>
                <MicroLabel className="text-tp-ink-faint">Illustrative</MicroLabel>
              </div>

              <dl className="divide-y divide-tp-rule font-mono text-sm">
                {CHAIN_HOLDS.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-6 py-3">
                    <dt className="text-tp-ink-faint">{row.key}</dt>
                    <dd data-tp-ledger-value className="text-right text-tp-ink">
                      {row.value}
                    </dd>
                  </div>
                ))}
                {NEVER_SENT.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-6 py-3">
                    <dt className="text-tp-ink-faint">{row.key}</dt>
                    <dd>
                      <span
                        data-tp-ledger-bar
                        aria-label="never sent"
                        className="inline-block h-3 translate-y-px rounded-[2px] bg-tp-redact"
                        style={{ width: `${row.width}px` }}
                      />
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="border-t border-tp-rule py-3 text-[0.6875rem] font-medium tracking-[0.12em] text-tp-ink-faint uppercase">
                A bar means never sent — not encrypted, not stored.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
