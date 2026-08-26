import { LoopPanel, MicroLabel, SectionIntro } from '../shared';
import { CORRIDOR } from '../motion/disclosureCorridor';

/**
 * The disclosure corridor: eight fields, one wall, two outcomes.
 *
 * This is the chapter that has to land, so it gets the full width and no
 * rounded shell. Left of the wall is the visitor's own device; right of it is
 * the public ledger. Four fields cross whole. Four are handed to the wall and
 * stop there — and what the chain receives in their place is a blank, not a
 * ciphertext waiting for someone's key.
 */
export function DisclosureSection() {
  // Read from the token set so the instrument turns over with the theme.
  const ink = 'var(--tp-ink)';
  const muted = 'var(--tp-ink-faint)';
  const faint = 'var(--tp-rule-strong)';

  return (
    <section id="record" className="border-b border-tp-rule bg-tp-surface-alt">
      <div className="mx-auto max-w-[92rem] px-5 py-20 sm:px-8 md:py-28">
        <SectionIntro
          className="max-w-3xl"
          eyebrow="The line"
          title="One invoice, and the only thing that crosses is a fact."
          lede="Every payment on a transparent chain publishes what you charged and who paid it. TacitPay writes a status and a commitment, and stops. The amount and the memo are not encrypted somewhere for later — they are simply never sent."
        />

        {/* Below the width the instrument needs, it would only ever show its
            own setup — the chain column, which is the entire point, would sit
            off the edge of a phone. Small screens get the conclusion directly
            instead of a diagram they have to drag. */}
        <LoopPanel
          className="mt-14 hidden xl:block"
          loop="disclosure-corridor"
          title="Disclosure corridor"
          note="Illustrative fields"
          restPhase="boundary idle"
          restValue="illustrative fields"
        >
          {/* Wide instrument: it scrolls inside its own rail rather than making
              the page scroll sideways. */}
          <div className="overflow-x-auto pb-2">
            <svg
              data-tp-asset="disclosure-corridor"
              viewBox={`0 0 ${CORRIDOR.width} ${CORRIDOR.height}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Eight invoice fields approach the chain boundary. Invoice id, status, expiry and commitment cross it and appear on the public ledger. Amount, memo, merchant and payer stop at the boundary, and the ledger receives a blank bar in their place."
              className="min-w-[62rem]"
            >
              {/* ------------------------------------------------- column heads */}
              <text
                x={CORRIDOR.keyX}
                y={CORRIDOR.headerY}
                fill={ink}
                fontSize="11"
                letterSpacing="1.8"
              >
                ON YOUR DEVICE
              </text>
              <text
                x={CORRIDOR.wallX}
                y={CORRIDOR.headerY}
                fill={muted}
                fontSize="11"
                textAnchor="middle"
                letterSpacing="1.8"
              >
                CHAIN BOUNDARY
              </text>
              <text
                x={CORRIDOR.width - 20}
                y={CORRIDOR.headerY}
                fill={ink}
                fontSize="11"
                textAnchor="end"
                letterSpacing="1.8"
              >
                ON THE CHAIN
              </text>
              <line
                x1={CORRIDOR.keyX - 20}
                y1={CORRIDOR.ruleY}
                x2={CORRIDOR.width - 20}
                y2={CORRIDOR.ruleY}
                stroke={faint}
              />

              {/* ---------------------------------------------------- the wall */}
              <line
                data-tp-wall
                x1={CORRIDOR.wallX}
                y1={CORRIDOR.wallTop}
                x2={CORRIDOR.wallX}
                y2={CORRIDOR.wallBottom}
                stroke={ink}
                strokeWidth="2"
                opacity="0.45"
              />

              {/* --------------------------------------------- group headings */}
              {CORRIDOR.groups.map((group) => (
                <text
                  key={group.label}
                  x={CORRIDOR.keyX}
                  y={group.y}
                  fill={muted}
                  fontSize="10"
                  letterSpacing="1.5"
                >
                  {group.label.toUpperCase()}
                </text>
              ))}
              <line
                x1={CORRIDOR.keyX - 20}
                y1={CORRIDOR.dividerY}
                x2={CORRIDOR.width - 20}
                y2={CORRIDOR.dividerY}
                stroke={faint}
                strokeDasharray="3 4"
              />

              {/* --------------------------------------------------- the rows */}
              {CORRIDOR.rows.map((row, index) => (
                <g key={row.key}>
                  <text
                    x={CORRIDOR.keyX}
                    y={row.y}
                    fill={muted}
                    fontSize="13"
                    fontFamily="var(--font-mono)"
                  >
                    {row.key}
                  </text>
                  <text
                    x={CORRIDOR.valueX}
                    y={row.y}
                    fill={ink}
                    fontSize="13"
                    fontFamily="var(--font-mono)"
                  >
                    {row.value}
                  </text>

                  {/* The travelling field. */}
                  <rect
                    data-tp-packet={index}
                    x={CORRIDOR.packetStartX}
                    y={row.y - 9}
                    width="18"
                    height="11"
                    rx="1"
                    fill={ink}
                    opacity="0"
                  />

                  {/* What the ledger ends up holding, one way or the other.
                      Authored visible so the answer survives reduced motion; the
                      timeline clears it before each run. */}
                  {row.crosses ? (
                    <text
                      data-tp-landed={index}
                      x={CORRIDOR.ledgerX}
                      y={row.y}
                      fill={ink}
                      fontSize="13"
                      fontFamily="var(--font-mono)"
                    >
                      {row.value}
                    </text>
                  ) : (
                    <rect
                      data-tp-landed={index}
                      x={CORRIDOR.ledgerX}
                      y={row.y - 10}
                      width={row.redact}
                      height="12"
                      rx="2"
                      fill="var(--tp-redact)"
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>
        </LoopPanel>

        <div className="mt-12 xl:hidden">
          {CORRIDOR.groups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex === 0 ? '' : 'mt-10'}>
              <MicroLabel className="text-tp-ink-faint">{group.label}</MicroLabel>
              <dl className="mt-4 divide-y divide-tp-rule border-y border-tp-rule font-mono text-sm">
                {CORRIDOR.rows
                  .filter((row) => row.crosses === (groupIndex === 0))
                  .map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-6 py-3">
                      <dt className="text-tp-ink-faint">{row.key}</dt>
                      <dd className="text-right text-tp-ink">
                        {row.crosses ? (
                          row.value
                        ) : (
                          <span
                            aria-label="never sent"
                            className="inline-block h-3 translate-y-px rounded-[2px] bg-tp-redact"
                            style={{ width: `${Math.round(row.redact * 0.72)}px` }}
                          />
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          ))}
          <p className="mt-4 text-[0.6875rem] font-medium tracking-[0.12em] text-tp-ink-faint uppercase">
            What the chain holds. Illustrative fields.
          </p>
        </div>
      </div>
    </section>
  );
}
