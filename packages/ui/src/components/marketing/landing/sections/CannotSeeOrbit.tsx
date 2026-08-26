import { EclipseMark } from '../../EclipseMark';

/**
 * The mark, with probes circling it.
 *
 * Three of them, one per claim in this chapter — the server, the prover, the
 * keys. Each orbits the shielded ring and never crosses it, which is the
 * chapter's argument rather than an ambient flourish: things approach, and
 * none of them get in.
 *
 * The overlay shares EclipseMark's viewBox exactly, so the orbit centre is the
 * settlement node rather than the middle of the artboard. Periods are
 * deliberately coprime-ish and one runs backwards, so the three never fall into
 * step and start reading as a mechanism.
 */
const ORBITS = [
  { radius: 122, seconds: 29, reverse: false, size: 3.5 },
  { radius: 150, seconds: 43, reverse: true, size: 2.5 },
  { radius: 176, seconds: 35, reverse: false, size: 3 },
] as const;

/** Matches the constants in EclipseMark. */
const CENTRE = { x: 240, y: 170 };

export function CannotSeeOrbit({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <EclipseMark annotated={false} className="w-full opacity-90" />

      <svg
        viewBox="0 0 520 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {/* One hairline track, so the probes read as following something. */}
        <circle
          cx={CENTRE.x}
          cy={CENTRE.y}
          r={ORBITS[1].radius}
          stroke="var(--tp-rule)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />

        {ORBITS.map((orbit) => (
          <g
            key={orbit.radius}
            className="tp-orbit"
            style={{
              animationDuration: `${orbit.seconds}s`,
              animationDirection: orbit.reverse ? 'reverse' : 'normal',
            }}
          >
            <circle
              cx={CENTRE.x}
              cy={CENTRE.y - orbit.radius}
              r={orbit.size}
              fill="var(--tp-ink-faint)"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
