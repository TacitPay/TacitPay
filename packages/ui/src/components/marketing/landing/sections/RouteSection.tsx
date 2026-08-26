import { Global, Link, ReceiptText, ShieldTick, type Icon } from 'iconsax-reactjs';

import { LoopPanel, MicroLabel, SectionIntro } from '../shared';
import { ROUTE } from '../motion/invoiceRoute';

/**
 * The route one invoice actually travels, on a graduated rail with its values
 * attached to the track rather than parked in cards. It is the same four moves
 * every time: commit, share, settle, verify — and at no point does a server
 * hold anything, because there is no server on the route at all.
 *
 * Each station sits in a bay carrying the glyph for what happens there. The
 * icons are nested `<svg>` elements: Iconsax spreads `x`/`y` onto its root, so
 * they place inside this drawing's own coordinate system like any other shape.
 */

/** One per station, in route order. */
const GLYPHS: readonly Icon[] = [ReceiptText, Link, ShieldTick, Global];

/** Gradations along the rail, drawn under the bays that cover them. */
const TICKS = Array.from(
  { length: Math.floor((ROUTE.railEnd - ROUTE.railStart) / ROUTE.tick) + 1 },
  (_, step) => ROUTE.railStart + step * ROUTE.tick,
);

export function RouteSection() {
  const ink = 'var(--tp-ink)';
  const muted = 'var(--tp-ink-faint)';
  const faint = 'var(--tp-rule)';
  const surface = 'var(--tp-surface)';
  // The same pair the app puts on a paid invoice, so "settled" is one colour
  // across the product rather than a green invented for this drawing.
  const settledInk = 'var(--status-paid-fg)';
  const settledGround = 'var(--status-paid-bg)';

  return (
    <section id="route" className="border-b border-tp-rule bg-tp-surface">
      <div className="mx-auto max-w-[92rem] px-5 py-20 sm:px-8 md:py-28">
        <SectionIntro
          className="max-w-3xl"
          eyebrow="The route"
          title="Four moves, and none of them involve trusting us."
          lede="Your device commits the invoice, the link carries the details in a fragment browsers never transmit, the payer's wallet proves they match, and anyone at all can check the result afterwards."
        />

        {/* Same rule as the corridor: the rail needs width, so narrow screens
            read the four moves as a list rather than dragging a diagram. */}
        <LoopPanel
          className="mt-14 hidden xl:block"
          loop="invoice-route"
          title="Invoice route"
          note="Illustrative sequence"
          restPhase="route ready"
          restValue="illustrative sequence"
        >
          <div className="overflow-x-auto pb-2">
            <svg
              data-tp-asset="invoice-route"
              viewBox={`0 0 ${ROUTE.width} ${ROUTE.height}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="An invoice travels one rail through four stations: create, which writes a commitment; share, which puts the details in a link fragment; settle, which is a shielded transfer marking the status paid; and verify, which anyone can read without a wallet."
              className="min-w-[62rem]"
            >
              {/* The rail: a graduated track, not a bare line. The bays are
                  filled with the surface colour, so the rail reads as passing
                  behind each station rather than through it. */}
              <g stroke={faint}>
                {TICKS.map((x) => (
                  <line key={x} x1={x} y1={ROUTE.railY - 5} x2={x} y2={ROUTE.railY + 5} />
                ))}
              </g>
              {/* The untravelled rail is deliberately faint: the progress line
                  over it is the second reading of how far the invoice has got,
                  and it only reads if there is something to read it against. */}
              <line
                x1={ROUTE.railStart}
                y1={ROUTE.railY}
                x2={ROUTE.railEnd}
                y2={ROUTE.railY}
                stroke={faint}
                strokeWidth="2"
              />
              <g transform={`translate(${ROUTE.railStart} ${ROUTE.railY})`}>
                <line
                  data-tp-progress
                  x1="0"
                  y1="0"
                  x2={ROUTE.railEnd - ROUTE.railStart}
                  y2="0"
                  stroke={ink}
                  strokeWidth="3"
                />
              </g>

              {/* End caps: a rail that just stops reads as unfinished. */}
              {[ROUTE.railStart, ROUTE.railEnd].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1={ROUTE.railY - 11}
                  x2={x}
                  y2={ROUTE.railY + 11}
                  stroke={muted}
                  strokeWidth="1.5"
                />
              ))}

              {/* The invoice itself, moving. A filled square, because that is
                  what the disclosure corridor spends its whole run teaching a
                  reader to recognise as a real value in transit.

                  Painted before the stations on purpose: each bay is filled
                  with the surface colour, so the invoice slides under one on
                  arrival rather than sitting on top of its glyph. It reads as
                  the station taking the invoice in, which is what happens. */}
              <rect
                data-tp-packet
                x={ROUTE.railStart - 7}
                y={ROUTE.railY - 7}
                width="14"
                height="14"
                rx="1.5"
                fill={ink}
                opacity="0"
              />

              {/* Rides from bay to bay with the invoice. Three cues then carry
                  progress independently: which stations are lit (done), where
                  the progress line stops, and where this collar is (now). */}
              <circle
                data-tp-marker
                cx={ROUTE.stations[0].x}
                cy={ROUTE.railY}
                r={ROUTE.bay + 8}
                stroke={ink}
                strokeWidth="1.25"
                strokeDasharray="3 5"
                opacity="0"
              />

              {/* Stations are authored settled: the rest state is the finished
                  route, and the timeline dims them back down to start a run, so
                  reduced motion is left with the whole story. */}
              {ROUTE.stations.map((station, index) => {
                const Glyph = GLYPHS[index];
                return (
                  <g key={station.label}>
                    <text
                      x={station.x}
                      y={ROUTE.railY - 58}
                      fill={ink}
                      fontSize="12"
                      textAnchor="middle"
                      letterSpacing="1.8"
                    >
                      {`${String(index + 1).padStart(2, '0')} ${station.label.toUpperCase()}`}
                    </text>

                    {/* Masks the rail and the gradations behind the bay. */}
                    <circle cx={station.x} cy={ROUTE.railY} r={ROUTE.bay} fill={surface} />
                    <circle
                      data-tp-station={index}
                      cx={station.x}
                      cy={ROUTE.railY}
                      r={ROUTE.bay}
                      stroke={ink}
                      strokeWidth="1.5"
                    />
                    <g data-tp-glyph={index}>
                      <Glyph
                        x={station.x - 15}
                        y={ROUTE.railY - 15}
                        size={30}
                        variant="Linear"
                        color={ink}
                        aria-hidden="true"
                      />
                    </g>

                    {/* The settled layer. It is a whole second copy of the bay
                        rather than a colour tween on the first, because the
                        tokens it uses are CSS variables and GSAP cannot
                        interpolate toward one — and hard-resolving them at
                        setup would leave stale colours the next time the
                        visitor changes theme. Cross-fading two authored layers
                        keeps both grounds correct for free.

                        Painted over the pending bay with an opaque ground, so
                        nothing of the dim state shows through. */}
                    <g data-tp-lit={index}>
                      <circle cx={station.x} cy={ROUTE.railY} r={ROUTE.bay} fill={settledGround} />
                      <circle
                        cx={station.x}
                        cy={ROUTE.railY}
                        r={ROUTE.bay}
                        stroke={settledInk}
                        strokeWidth="1.5"
                      />
                      <Glyph
                        x={station.x - 15}
                        y={ROUTE.railY - 15}
                        size={30}
                        variant="Linear"
                        color={settledInk}
                        aria-hidden="true"
                      />
                    </g>

                    <text
                      data-tp-value={index}
                      x={station.x}
                      y={ROUTE.railY + 64}
                      fill={muted}
                      fontSize="11.5"
                      textAnchor="middle"
                    >
                      {station.value}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </LoopPanel>

        <ol className="mt-12 divide-y divide-tp-rule border-y border-tp-rule xl:hidden">
          {ROUTE.stations.map((station, index) => (
            <li key={station.label} className="py-5">
              <MicroLabel className="text-tp-ink">
                {`${String(index + 1).padStart(2, '0')} · ${station.label}`}
              </MicroLabel>
              <p className="mt-2 text-sm text-tp-ink-muted">{station.value}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
