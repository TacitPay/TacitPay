import { EclipseMark } from '../../EclipseMark';

/**
 * The mark, with the chapter's three claims drawn as things that cannot reach
 * it: a server, a prover, and a set of keys.
 *
 * Each advances on the boundary, stops dead against it, and falls back. They
 * take turns rather than moving together, so the picture is one attempt failing
 * at a time. That is the argument this chapter makes in prose — anonymous dots
 * orbiting the logo said nothing at all.
 *
 * The overlay shares EclipseMark's viewBox exactly, so the boundary is centred
 * on the settlement node rather than on the middle of the artboard. Its radius
 * clears the mark's own extent: the disc reaches 120 user units from that
 * centre and the ring 122.5, so 140 sits outside both.
 */
const CENTRE = { x: 240, y: 170 };
const BOUNDARY = 140;

interface Probe {
  readonly label: string;
  /** Position on the boundary, and which keyframe drives it inward. */
  readonly x: number;
  readonly y: number;
  readonly animation: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly anchor: 'start' | 'end';
  /** Staggered so only one is pressing against the boundary at a time. */
  readonly delay: string;
}

const PROBES: readonly Probe[] = [
  {
    label: 'server',
    x: 108,
    y: 122,
    animation: 'tp-probe-left',
    labelX: 96,
    labelY: 126,
    anchor: 'end',
    delay: '0s',
  },
  {
    label: 'prover',
    x: 372,
    y: 122,
    animation: 'tp-probe-right',
    labelX: 384,
    labelY: 126,
    anchor: 'start',
    delay: '3s',
  },
  {
    label: 'keys',
    x: 240,
    y: 310,
    animation: 'tp-probe-foot',
    labelX: 252,
    labelY: 330,
    anchor: 'start',
    delay: '6s',
  },
];

export function CannotSeeProbes({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <div className="relative">
        <EclipseMark annotated={false} className="w-full opacity-90" />

        <svg
          viewBox="0 0 520 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="A server, a prover and a set of keys each advance on a boundary drawn around the mark, stop against it, and fall back. None of them reach the private state inside."
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {/* The boundary itself. Dashed because it is not a wall anyone built —
              it is simply where the design stops handing anything over. */}
          <circle
            cx={CENTRE.x}
            cy={CENTRE.y}
            r={BOUNDARY}
            stroke="var(--tp-ink-faint)"
            strokeWidth="1"
            strokeDasharray="5 7"
          />

          {PROBES.map((probe) => (
            <g key={probe.label}>
              <g
                className="tp-probe"
                style={{ animationName: probe.animation, animationDelay: probe.delay }}
              >
                {/* Square, like the packets in the disclosure corridor: the same
                    shape means the same thing across the page. */}
                <rect
                  x={probe.x - 4}
                  y={probe.y - 4}
                  width="8"
                  height="8"
                  rx="1"
                  fill="var(--tp-ink)"
                />
              </g>
              <text
                x={probe.labelX}
                y={probe.labelY}
                fill="var(--tp-ink-faint)"
                fontSize="13"
                textAnchor={probe.anchor}
                fontFamily="var(--font-mono)"
              >
                {probe.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="mt-6 text-center text-[0.6875rem] font-medium tracking-[0.14em] text-tp-ink-faint uppercase">
        Nothing crosses this line
      </p>
    </div>
  );
}
