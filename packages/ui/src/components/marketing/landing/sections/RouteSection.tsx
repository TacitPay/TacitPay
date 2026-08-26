import { LoopPanel, MicroLabel, SectionIntro } from '../shared';
import { ROUTE } from '../motion/invoiceRoute';

/**
 * The route one invoice actually travels, on straight rails with its values
 * attached to the track rather than parked in cards. It is the same four moves
 * every time: commit, share, settle, verify — and at no point does a server
 * hold anything, because there is no server on the route at all.
 */
export function RouteSection() {
  const ink = 'var(--tp-ink)';
  const muted = 'var(--tp-ink-faint)';
  const faint = 'var(--tp-rule)';

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
              fontFamily="var(--font-mono)"
            >
              {/* The rail, and the progress the invoice has made along it. */}
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
                  strokeWidth="2"
                />
              </g>

              {/* End caps: a rail that just stops reads as unfinished. */}
              {[ROUTE.railStart, ROUTE.railEnd].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1={ROUTE.railY - 9}
                  x2={x}
                  y2={ROUTE.railY + 9}
                  stroke={muted}
                />
              ))}

              {/* Stations and values are authored lit: the rest state is the
                  finished route, and the timeline dims them back down to start
                  a run. Reduced motion is left with the whole story. */}
              {ROUTE.stations.map((station, index) => (
                <g key={station.label}>
                  {/* Label above the rail, value below it — the value belongs to
                      the track, not to a card floating beside it. */}
                  <text
                    x={station.x}
                    y={ROUTE.railY - 40}
                    fill={ink}
                    fontSize="12"
                    textAnchor="middle"
                    letterSpacing="1.8"
                  >
                    {`${String(index + 1).padStart(2, '0')} ${station.label.toUpperCase()}`}
                  </text>
                  <line
                    x1={station.x}
                    y1={ROUTE.railY - 30}
                    x2={station.x}
                    y2={ROUTE.railY - 12}
                    stroke={faint}
                  />
                  <circle
                    data-tp-station={index}
                    cx={station.x}
                    cy={ROUTE.railY}
                    r="6"
                    fill={ink}
                  />
                  <text
                    data-tp-value={index}
                    x={station.x}
                    y={ROUTE.railY + 40}
                    fill={muted}
                    fontSize="11.5"
                    textAnchor="middle"
                  >
                    {station.value}
                  </text>
                </g>
              ))}

              {/* The invoice itself, moving. */}
              <circle
                data-tp-packet
                cx={ROUTE.railStart}
                cy={ROUTE.railY}
                r="9"
                fill={ink}
                opacity="0"
              />
            </svg>
          </div>
        </LoopPanel>

        <ol className="mt-12 divide-y divide-tp-rule border-y border-tp-rule xl:hidden">
          {ROUTE.stations.map((station, index) => (
            <li key={station.label} className="py-5">
              <MicroLabel className="text-tp-ink">
                {`${String(index + 1).padStart(2, '0')} · ${station.label}`}
              </MicroLabel>
              <p className="mt-2 font-mono text-sm text-tp-ink-muted">{station.value}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
