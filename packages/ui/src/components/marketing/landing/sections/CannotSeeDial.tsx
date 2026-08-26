import { EclipseMark } from '../../EclipseMark';

/**
 * The chapter's three claims, drawn as an instrument that keeps looking.
 *
 * A graduated bezel rings the mark and an index travels around it, interrogating
 * a station for a server, a prover and a set of keys. Every station is drawn
 * empty, because that is the actual claim: these components are not guarded,
 * they are absent. Nothing is refused here — there is nothing fitted to find.
 *
 * The arrival beat matters more than it looks. A station that BRIGHTENS as the
 * index reaches it reads, in every scanner idiom anyone has ever seen, as a
 * contact being detected — the exact opposite of the claim. So the station dims
 * and shrinks instead, and the answer is spelled out in words beside it, since
 * a negative result is the one thing a graphic cannot state on its own.
 *
 * The version before this had three dots creeping at a dashed circle, which
 * argued something else again: attackers held at a wall.
 */

// Taller than the dial needs, because the bottom station's answer has to sit
// below its label without touching the edge.
const VIEW = { w: 480, h: 452 };

// EclipseMark's own frame. These mirror the constants in EclipseMark.tsx, which
// in turn mirror components/Logo.tsx — keep all three in step if the mark ever
// changes shape.
const MARK = { w: 520, h: 340, cx: 240, cy: 170 };
/** The mark's width as a fraction of this composition. */
const MARK_SCALE = 0.9;

const SCALE = (VIEW.w * MARK_SCALE) / MARK.w;

// The mark's optical centre is not its viewBox centre — it was drawn with
// annotation room to the right. Centring the artboard would therefore hang the
// dial off-axis, so the mark is nudged by exactly that offset and the dial can
// then be built around the middle of the box.
const CENTRE = { x: VIEW.w / 2, y: VIEW.h / 2 };
const MARK_NUDGE = ((MARK.w / 2 - MARK.cx) * SCALE) / (VIEW.w * MARK_SCALE);

// The mark reaches 122.5 units of its own frame, so 102 of these. Everything
// below starts at 118 and stays clear of it.
const DIAL = {
  inner: 118,
  band: 133,
  majorTick: 136,
  minorTick: 142,
  outer: 148,
  pointer: 151,
  label: 175,
} as const;

const round = (value: number) => Math.round(value * 100) / 100;

const pointAt = (radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: round(CENTRE.x + radius * Math.cos(radians)),
    y: round(CENTRE.y + radius * Math.sin(radians)),
  };
};

const arcAt = (radius: number, from: number, to: number) => {
  const start = pointAt(radius, from);
  const end = pointAt(radius, to);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
};

interface Socket {
  readonly label: string;
  /** Where on the bezel it sits, and therefore when the index reaches it. */
  readonly bearing: number;
  readonly anchor: 'start' | 'middle' | 'end';
  /** Nudges the label off its own baseline so it reads centred on the station. */
  readonly labelDy: number;
}

/** Sits under each label and carries the result of the interrogation. */
const ANSWER = 'not fitted';
const ANSWER_DY = 17;

const SOCKETS: readonly Socket[] = [
  { label: 'keys', bearing: 90, anchor: 'middle', labelDy: 11 },
  { label: 'server', bearing: 200, anchor: 'end', labelDy: 4.5 },
  { label: 'prover', bearing: 340, anchor: 'start', labelDy: 4.5 },
];

// Graduations. Minors land every 10°; the four majors sit on the diagonals,
// which is the one set of quarter marks that clears every socket bearing.
const MINOR_TICKS = Array.from({ length: 36 }, (_, step) => step * 10);
const MAJOR_TICKS = [45, 135, 225, 315];

// The index leaves a wake across the graduations it has just read. Eight short
// arcs fall off faster than a single gradient would, and unlike a gradient the
// falloff actually follows the angle.
const WAKE = [0.2, 0.15, 0.11, 0.08, 0.055, 0.035, 0.02, 0.01];
const WAKE_STEP = 6;

export function CannotSeeDial({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <div className="relative w-full" style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Width and offset both come from the constants the dial geometry is
              derived from, so the mark and its bezel cannot drift apart. */}
          <div
            style={{
              width: `${MARK_SCALE * 100}%`,
              transform: `translateX(${round(MARK_NUDGE * 100)}%)`,
            }}
          >
            <EclipseMark annotated={false} className="w-full" />
          </div>
        </div>

        <svg
          data-tp-asset="cannot-see-dial"
          data-tp-dial-centre={`${CENTRE.x} ${CENTRE.y}`}
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="A graduated dial rings the mark. An index travels around it and interrogates three stations, labelled server, prover and keys. Each one answers 'not fitted': TacitPay runs no server, runs no prover, and holds no keys, so there is nothing at any of them to find."
          className="absolute inset-0 h-full w-full"
        >
          {/* The bezel: a dashed inner edge, a graduated outer edge. */}
          <circle
            cx={CENTRE.x}
            cy={CENTRE.y}
            r={DIAL.inner}
            stroke="var(--tp-ink-faint)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <circle
            cx={CENTRE.x}
            cy={CENTRE.y}
            r={DIAL.outer}
            stroke="var(--tp-rule-strong)"
            strokeWidth="1"
          />

          <g stroke="var(--tp-rule-strong)" strokeWidth="1">
            {MINOR_TICKS.map((degrees) => {
              const from = pointAt(DIAL.minorTick, degrees);
              const to = pointAt(DIAL.outer, degrees);
              return (
                <line
                  key={`minor-${degrees}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  opacity="0.55"
                />
              );
            })}
            {MAJOR_TICKS.map((degrees) => {
              const from = pointAt(DIAL.majorTick, degrees);
              const to = pointAt(DIAL.outer, degrees);
              return <line key={`major-${degrees}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
            })}
          </g>

          {/* The index. Everything inside turns together, so the wake stays
              welded to the pointer that cast it. */}
          <g data-tp-dial-index>
            {WAKE.map((opacity, step) => (
              <path
                className="tp-dial-wake"
                key={opacity}
                d={arcAt(DIAL.band, -(step + 1) * WAKE_STEP, -step * WAKE_STEP)}
                stroke={`rgb(var(--tp-glow)/${opacity})`}
                strokeWidth={DIAL.outer - DIAL.inner}
              />
            ))}
            <line
              x1={round(CENTRE.x + DIAL.inner - 2)}
              y1={CENTRE.y}
              x2={round(CENTRE.x + DIAL.outer + 2)}
              y2={CENTRE.y}
              stroke="var(--tp-ink)"
              strokeWidth="2.5"
            />
            {/* A pointer on the outside of the bezel, so the index reads as an
                instrument taking a reading rather than a beam sweeping. */}
            <path
              d={`M ${round(CENTRE.x + DIAL.pointer)} ${CENTRE.y} L ${round(CENTRE.x + DIAL.pointer + 9)} ${round(CENTRE.y - 5.5)} L ${round(CENTRE.x + DIAL.pointer + 9)} ${round(CENTRE.y + 5.5)} Z`}
              fill="var(--tp-ink)"
            />
          </g>

          {SOCKETS.map((socket) => {
            const seat = pointAt(DIAL.band, socket.bearing);
            const label = pointAt(DIAL.label, socket.bearing);
            return (
              <g key={socket.label}>
                {/* Empty on purpose. The disclosure corridor spends the whole
                    page teaching that a filled square is a real thing moving;
                    this is that shape with nothing in it. */}
                <rect
                  data-tp-dial-socket={socket.bearing}
                  x={round(seat.x - 8)}
                  y={round(seat.y - 8)}
                  width="16"
                  height="16"
                  rx="1"
                  stroke="var(--tp-ink-faint)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={label.x}
                  y={round(label.y + socket.labelDy)}
                  fill="var(--tp-ink-faint)"
                  fontSize="13"
                  textAnchor={socket.anchor}
                  fontFamily="var(--font-mono)"
                >
                  {socket.label}
                </text>
                {/* The answer, and the point of the whole chapter. Its cue is
                    derived from this station's own bearing by the timeline in
                    motion/cannotSeeDial.ts, so it lands as the index arrives
                    and cannot drift away from it. Sans rather than mono because
                    it is an annotation on the drawing, not an identifier. */}
                <text
                  data-tp-dial-answer
                  x={label.x}
                  y={round(label.y + socket.labelDy + ANSWER_DY)}
                  fill="var(--tp-ink-muted)"
                  fontSize="11"
                  letterSpacing="0.07em"
                  textAnchor={socket.anchor}
                >
                  {ANSWER}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-4 text-center text-[0.6875rem] font-medium tracking-[0.14em] text-tp-ink-faint uppercase">
        Nothing here to find
      </p>
    </div>
  );
}
