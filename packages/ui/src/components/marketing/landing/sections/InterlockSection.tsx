import { LoopPanel, SectionIntro } from '../shared';
import { INTERLOCK } from '../motion/circuitInterlock';

/**
 * The four circuits, and the only rounded panel on the page — the register is
 * reserved for the one chapter that shows the protocol instrument itself.
 *
 * Each gate is the mark: a public disc and a shielded ring that close into an
 * eclipse when a check passes. Every fourth run the expiry gate holds and the
 * invoice takes `cancelInvoice` instead, because a cancelled invoice is an
 * outcome the contract supports rather than a failure of it. The rest state
 * shows the complete passed route, which is what reduced motion is left with.
 */
export function InterlockSection() {
  const ink = 'var(--tp-ink)';
  const muted = 'var(--tp-ink-faint)';
  const faint = 'var(--tp-rule)';
  const warn = 'var(--tp-warn)';
  const divertGate = INTERLOCK.gates[INTERLOCK.divertAt];

  return (
    <section id="circuits" className="border-b border-tp-rule bg-tp-surface-alt">
      <div className="mx-auto max-w-[92rem] px-5 py-20 sm:px-8 md:py-28">
        <SectionIntro
          className="max-w-3xl"
          eyebrow="The contract"
          title="Four circuits, and every one of them discloses nothing."
          lede="Ownership is proven from a secret that only exists on your device — never from a key the prover hands in, which anyone could claim. The gates below are the mark itself: they close when a check passes, and they hold when it does not."
        />

        {/* The gates need width to read as gates; narrow screens get the four
            circuits and their checks as plain rows. */}
        <LoopPanel
          loop="circuit-interlock"
          title="Circuit interlock"
          note="Illustrative sequence"
          restPhase="interlock ready"
          restValue="illustrative sequence"
          className="mt-14 hidden overflow-hidden rounded-xl border border-tp-rule bg-tp-surface xl:block"
          chromeClassName="border-t-0 px-5 sm:px-7"
        >
          <div className="overflow-x-auto p-5 sm:p-7">
            <svg
              data-tp-asset="circuit-interlock"
              viewBox={`0 0 ${INTERLOCK.width} ${INTERLOCK.height}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="An invoice runs one route past three gates: createInvoice writes a commitment, payInvoice checks the preimage and the expiry, and withdraw is proven from the merchant secret. When the expiry gate holds, the invoice diverts to cancelInvoice and the escrow returns to the payer."
              className="min-w-[62rem]"
              fontFamily="var(--font-mono)"
            >
              {/* ------------------------------------------------- the two rails */}
              <line
                x1={INTERLOCK.entryX}
                y1={INTERLOCK.mainY}
                x2={INTERLOCK.exitX}
                y2={INTERLOCK.mainY}
                stroke={faint}
                strokeWidth="2"
              />
              <path
                data-tp-divert-rail
                d={`M ${INTERLOCK.divertFromX} ${INTERLOCK.mainY} L ${INTERLOCK.divertFromX} ${INTERLOCK.divertY - 18} Q ${INTERLOCK.divertFromX} ${INTERLOCK.divertY} ${INTERLOCK.divertFromX + 18} ${INTERLOCK.divertY} L ${INTERLOCK.exitX} ${INTERLOCK.divertY}`}
                stroke={warn}
                strokeWidth="2"
                strokeDasharray="4 5"
                opacity="0.35"
              />

              <text
                x={INTERLOCK.entryX}
                y={INTERLOCK.mainY - 44}
                fill={muted}
                fontSize="10.5"
                letterSpacing="1.6"
              >
                CANDIDATE
              </text>
              <line
                x1={INTERLOCK.entryX}
                y1={INTERLOCK.mainY - 10}
                x2={INTERLOCK.entryX}
                y2={INTERLOCK.mainY + 10}
                stroke={muted}
              />

              {/* ----------------------------------------------------- the gates */}
              {INTERLOCK.gates.map((gate, index) => (
                <g key={gate.circuit}>
                  <text
                    x={gate.x}
                    y={INTERLOCK.mainY - 62}
                    fill={ink}
                    fontSize="12.5"
                    textAnchor="middle"
                  >
                    {gate.circuit}
                  </text>
                  <text
                    x={gate.x}
                    y={INTERLOCK.mainY - 44}
                    fill={muted}
                    fontSize="10.5"
                    textAnchor="middle"
                  >
                    {gate.check}
                  </text>

                  {/* Authored eclipsed — the rest state is a route that passed. */}
                  <circle
                    data-tp-gate-disc={index}
                    cx={gate.x - INTERLOCK.gateRest}
                    cy={INTERLOCK.mainY}
                    r={INTERLOCK.radius}
                    fill={ink}
                  />
                  <circle
                    data-tp-gate-ring={index}
                    cx={gate.x + INTERLOCK.gateRest}
                    cy={INTERLOCK.mainY}
                    r={INTERLOCK.radius}
                    stroke="var(--tp-mark-ring)"
                    strokeWidth="2.5"
                  />
                  <circle
                    data-tp-gate-node={index}
                    cx={gate.x}
                    cy={INTERLOCK.mainY}
                    r="3.4"
                    fill="var(--tp-surface)"
                  />

                  {/* Shown only on the cycle where this gate refuses. */}
                  <text
                    data-tp-gate-held={index}
                    x={gate.x}
                    y={INTERLOCK.mainY + 40}
                    fill={warn}
                    fontSize="10.5"
                    textAnchor="middle"
                    letterSpacing="1.5"
                    opacity="0"
                  >
                    HELD — EXPIRED
                  </text>
                </g>
              ))}

              {/* ----------------------------------------------------- the exits */}
              <text
                data-tp-exit="pass"
                x={INTERLOCK.chipX}
                y={INTERLOCK.mainY + 4}
                fill={ink}
                fontSize="12"
                letterSpacing="1.6"
              >
                SETTLED
              </text>
              <text
                data-tp-exit="divert"
                x={INTERLOCK.chipX}
                y={INTERLOCK.divertY + 4}
                fill={warn}
                fontSize="12"
                letterSpacing="1.6"
                opacity="0.22"
              >
                REFUNDED
              </text>
              <text
                x={INTERLOCK.divertFromX + 26}
                y={INTERLOCK.divertY - 12}
                fill={muted}
                fontSize="10.5"
                letterSpacing="1.5"
              >
                {INTERLOCK.divertCircuit}
              </text>

              {/* The candidate invoice. */}
              <circle
                data-tp-ip-packet
                cx={INTERLOCK.entryX}
                cy={INTERLOCK.mainY}
                r="8"
                fill={ink}
                opacity="0"
              />
            </svg>
          </div>
        </LoopPanel>

        <ol className="mt-12 divide-y divide-tp-rule border-y border-tp-rule xl:hidden">
          {[
            ...INTERLOCK.gates.map((gate) => ({
              circuit: gate.circuit,
              check: gate.check,
              held: false,
            })),
            {
              circuit: INTERLOCK.divertCircuit,
              check: 'expired — escrow returns to the payer',
              held: true,
            },
          ].map((step) => (
            <li key={step.circuit} className="py-5">
              <p className={`font-mono text-sm ${step.held ? 'text-tp-warn' : 'text-tp-ink'}`}>
                {step.circuit}
              </p>
              <p className="mt-1.5 font-mono text-[0.8125rem] text-tp-ink-muted">{step.check}</p>
            </li>
          ))}
        </ol>

        <p className="mt-5 max-w-2xl font-mono text-[0.6875rem] leading-5 tracking-[0.1em] text-tp-ink-faint uppercase">
          {`Every fourth run, ${divertGate.circuit} holds and the escrow returns to the payer.`}
        </p>
      </div>
    </section>
  );
}
