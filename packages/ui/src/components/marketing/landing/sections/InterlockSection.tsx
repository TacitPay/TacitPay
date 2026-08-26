import { LoopPanel, SectionIntro } from '../shared';
import { INTERLOCK } from '../motion/circuitInterlock';

/**
 * The four circuits as a disclosure matrix: what each one takes in on the left,
 * what it writes to the ledger on the right, and the terminator between them.
 *
 * The route two sections above is a sequence, so this cannot be another one.
 * More to the point, the order of the circuits is not what this section claims
 * — it claims that nothing on the private side of the line reaches the public
 * side, and a matrix is the only shape that shows that rather than asserting it.
 *
 * Every cell comes from contracts/tacitpay.compact. Nothing here is decorative:
 * an empty cell means the circuit genuinely does not touch that field.
 *
 * The cells are authored FILLED and emptied by the timeline at the start of a
 * run, never the other way round. Standing still — reduced motion, or a
 * screenshot for the deck — this has to be the completed table, because an
 * empty grid of column headings argues nothing at all.
 */
export function InterlockSection() {
  const ink = 'var(--tp-ink)';
  const muted = 'var(--tp-ink-faint)';
  const faint = 'var(--tp-rule)';
  const strong = 'var(--tp-rule-strong)';
  const warn = 'var(--tp-warn)';
  const holdCircuit = INTERLOCK.circuits[INTERLOCK.divertAt].circuit;
  const divertCircuit = INTERLOCK.circuits[INTERLOCK.divertTo].circuit;
  const lastRow = INTERLOCK.rows[INTERLOCK.rows.length - 1];
  const dividerEnd = lastRow + 34;

  return (
    <section id="circuits" className="border-b border-tp-rule bg-tp-surface-alt">
      <div className="mx-auto max-w-[92rem] px-5 py-20 sm:px-8 md:py-28">
        <SectionIntro
          className="max-w-3xl"
          eyebrow="The contract"
          title="Four circuits, and every one of them discloses nothing."
          lede="Ownership is proven from a secret that only exists on your device — never from a key the prover hands in, which anyone could claim. Read the table left to right: everything a circuit takes in, then everything it writes down. Nothing appears on both sides."
        />

        {/* A matrix needs its columns, so narrow screens get the four circuits
            and their checks as plain rows instead. */}
        <LoopPanel
          loop="circuit-interlock"
          title="Circuit interlock"
          note="Read from contracts/tacitpay.compact"
          restPhase="interlock ready"
          restValue="four circuits · nothing disclosed"
          className="mt-14 hidden overflow-hidden rounded-xl border border-tp-rule bg-tp-surface xl:block"
          chromeClassName="border-t-0 px-5 sm:px-7"
        >
          <div className="p-5 sm:p-7">
            <svg
              data-tp-asset="circuit-interlock"
              viewBox={`0 0 ${INTERLOCK.width} ${INTERLOCK.height}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="A table of the four circuits. createInvoice, payInvoice, withdraw and cancelInvoice each take private inputs — amount, memo hash, salt and a secret — and between them write only a commitment, a tag and a status. No private field appears on the written side, and when the expiry check holds, payInvoice writes nothing at all and cancelInvoice returns the escrow instead."
              className="w-full"
            >
              {/* ------------------------------------------------ group heads */}
              <g fill={muted} fontSize="10" letterSpacing="1.7">
                <text x={INTERLOCK.takes[0].x - 20} y={INTERLOCK.groupY}>
                  TAKES IN · PRIVATE
                </text>
                <text x={INTERLOCK.writes[0].x - 32} y={INTERLOCK.groupY}>
                  WRITES · PUBLIC
                </text>
              </g>

              <g fill={muted} fontSize="10.5" textAnchor="middle" fontFamily="var(--font-mono)">
                {INTERLOCK.takes.map((column) => (
                  <text key={column.label} x={column.x} y={INTERLOCK.headerY}>
                    {column.label}
                  </text>
                ))}
                {INTERLOCK.writes.map((column) => (
                  <text key={column.label} x={column.x} y={INTERLOCK.headerY}>
                    {column.label}
                  </text>
                ))}
              </g>
              <text
                x={INTERLOCK.statusX}
                y={INTERLOCK.headerY}
                fill={muted}
                fontSize="10.5"
                fontFamily="var(--font-mono)"
              >
                status
              </text>
              <line
                x1={INTERLOCK.circuitX}
                y1={INTERLOCK.ruleY}
                x2={INTERLOCK.width - 24}
                y2={INTERLOCK.ruleY}
                stroke={strong}
              />

              {/* ------------------------------------------------ the divider */}
              {/* The terminator, stood on end: the same three layers the splash
                  uses — a diffuse corridor, a band, and a hairline rail —
                  because this is the same line, drawn where a reader can check
                  that nothing crossed it.

                  Every layer is a gradient, never a flat fill. A filled rect
                  reads as a grey slab with hard ends, which is exactly what the
                  splash's terminator looked like before it was fixed. The
                  gradients are in user space because a vertical line has no
                  bounding-box width for the default units to work against. */}
              <defs>
                {[
                  { id: 'tpDividerCorridor', peak: 0.06 },
                  { id: 'tpDividerBand', peak: 0.12 },
                  { id: 'tpDividerRail', peak: 0.75 },
                ].map((layer) => (
                  <linearGradient
                    key={layer.id}
                    id={layer.id}
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1={INTERLOCK.ruleY}
                    x2="0"
                    y2={dividerEnd}
                  >
                    <stop offset="0%" stopColor="rgb(var(--tp-glow))" stopOpacity="0" />
                    <stop offset="50%" stopColor="rgb(var(--tp-glow))" stopOpacity={layer.peak} />
                    <stop offset="100%" stopColor="rgb(var(--tp-glow))" stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>
              <g data-tp-divider opacity="0.55">
                <rect
                  x={INTERLOCK.dividerX - 30}
                  y={INTERLOCK.ruleY}
                  width="60"
                  height={dividerEnd - INTERLOCK.ruleY}
                  fill="url(#tpDividerCorridor)"
                />
                <rect
                  x={INTERLOCK.dividerX - 10}
                  y={INTERLOCK.ruleY}
                  width="20"
                  height={dividerEnd - INTERLOCK.ruleY}
                  fill="url(#tpDividerBand)"
                />
                <rect
                  x={INTERLOCK.dividerX - 0.5}
                  y={INTERLOCK.ruleY}
                  width="1"
                  height={dividerEnd - INTERLOCK.ruleY}
                  fill="url(#tpDividerRail)"
                />
              </g>

              {/* ------------------------------------------------- the circuits */}
              {INTERLOCK.circuits.map((entry, index) => {
                const y = INTERLOCK.rows[index];
                const tone = entry.branch ? warn : ink;
                return (
                  <g key={entry.circuit} data-tp-row={index}>
                    <text
                      x={INTERLOCK.circuitX}
                      y={y + 4}
                      fill={tone}
                      fontSize="13.5"
                      fontFamily="var(--font-mono)"
                    >
                      {entry.circuit}
                    </text>

                    {/* What goes in: a dot per private input the circuit takes. */}
                    <g data-tp-takes={index}>
                      {entry.takes.map(
                        (taken, column) =>
                          taken && (
                            <circle
                              key={INTERLOCK.takes[column].label}
                              cx={INTERLOCK.takes[column].x}
                              cy={y}
                              r="4.5"
                              fill={tone}
                            />
                          ),
                      )}
                    </g>

                    {/* What comes out: a filled square, the page's mark for a
                        real value that actually moved. */}
                    <g data-tp-writes={index}>
                      {entry.writes.map(
                        (written, column) =>
                          written && (
                            <rect
                              key={INTERLOCK.writes[column].label}
                              x={INTERLOCK.writes[column].x - 5.5}
                              y={y - 5.5}
                              width="11"
                              height="11"
                              rx="1.5"
                              fill={tone}
                            />
                          ),
                      )}
                    </g>

                    <text
                      data-tp-status={index}
                      x={INTERLOCK.statusX}
                      y={y + 4}
                      fill={tone}
                      fontSize="11.5"
                      letterSpacing="1.4"
                      fontFamily="var(--font-mono)"
                    >
                      {entry.status}
                    </text>

                    {/* Only ever on the row that can hold. */}
                    {index === INTERLOCK.divertAt && (
                      <text
                        data-tp-held
                        x={INTERLOCK.writes[0].x - 32}
                        y={y + 4}
                        fill={warn}
                        fontSize="11"
                        letterSpacing="1.4"
                        opacity="0"
                      >
                        HELD — EXPIRED · NOTHING WRITTEN
                      </text>
                    )}

                    <line
                      x1={INTERLOCK.circuitX}
                      y1={y + 27}
                      x2={INTERLOCK.width - 24}
                      y2={y + 27}
                      stroke={faint}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </LoopPanel>

        <ol className="mt-12 divide-y divide-tp-rule border-y border-tp-rule xl:hidden">
          {INTERLOCK.circuits.map((entry) => (
            <li key={entry.circuit} className="py-5">
              <p className={`font-mono text-sm ${entry.branch ? 'text-tp-warn' : 'text-tp-ink'}`}>
                {entry.circuit}
              </p>
              <p className="mt-1.5 text-sm text-tp-ink-muted">{entry.check}</p>
            </li>
          ))}
        </ol>

        <p className="mt-5 max-w-2xl text-[0.6875rem] leading-5 font-medium tracking-[0.12em] text-tp-ink-faint uppercase">
          {`Every fourth run, ${holdCircuit} holds and ${divertCircuit} returns the escrow to the payer.`}
        </p>
      </div>
    </section>
  );
}
