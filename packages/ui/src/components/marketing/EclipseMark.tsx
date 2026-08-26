// The brand mark at display size, annotated like a technical drawing.
// It is the same three shapes as components/Logo.tsx — a solid public disc, a
// shielded ring, and the settlement node where they meet — but large enough to
// carry leader lines, so the logo doubles as the diagram that explains the
// product. Keep the geometry in sync with Logo.tsx if the mark ever changes.

const DISC = { cx: 200, cy: 170, r: 80 };
const RING = { cx: 280, cy: 170, r: 80 };
// The node sits exactly between the two centres, as it does in the logo.
const NODE = { cx: (DISC.cx + RING.cx) / 2, cy: 170, r: 15 };

interface EclipseMarkProps {
  /** Renders leader lines and labels. Off gives just the mark. */
  annotated?: boolean;
  /** Inverts for dark surfaces: the disc goes light, the node goes dark. */
  inverted?: boolean;
  className?: string;
}

export function EclipseMark({
  annotated = true,
  inverted = false,
  className = '',
}: EclipseMarkProps) {
  const discFill = inverted ? '#fafafa' : '#09090b';
  const nodeFill = inverted ? '#09090b' : '#ffffff';
  const ringStroke = inverted ? '#52525b' : '#a1a1aa';
  const hairline = inverted ? '#3f3f46' : '#d4d4d8';
  const labelInk = inverted ? '#e4e4e7' : '#18181b';
  const labelMuted = inverted ? '#71717a' : '#a1a1aa';

  return (
    <svg
      viewBox="0 0 520 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Two overlapping circles: a solid disc for the public ledger, an outlined ring for private state, and a node where they meet for verified settlement."
      className={className}
    >
      {annotated && (
        <g
          stroke={hairline}
          strokeWidth="1"
          className="tp-rise"
          style={{ animationDelay: '620ms' }}
        >
          {/* Public ledger — leader to the upper left. */}
          <path d="M148 118 L104 74 L26 74" />
          {/* Shielded state — leader to the upper right. */}
          <path d="M332 118 L376 74 L494 74" />
          {/* Settlement node — leader straight down. */}
          <path d={`M${NODE.cx} ${NODE.cy + NODE.r + 6} L${NODE.cx} 286`} />
        </g>
      )}

      {/* Shielded state: present and provable, but never filled in. It travels
          into place on load — the eclipse actually happening. */}
      <circle
        cx={RING.cx}
        cy={RING.cy}
        r={RING.r}
        stroke={ringStroke}
        strokeWidth="5"
        className="tp-eclipse"
        style={{ animationDelay: '260ms' }}
      />

      {/* Public ledger: solid, unambiguous, always visible. Painted AFTER the
          ring so the disc covers it, exactly as components/Logo.tsx does — the
          ring is a background line, not an overlay. */}
      <circle
        cx={DISC.cx}
        cy={DISC.cy}
        r={DISC.r}
        fill={discFill}
        className="tp-rise"
        style={{ animationDelay: '120ms' }}
      />

      {/* The one point both sides agree on. */}
      <circle
        cx={NODE.cx}
        cy={NODE.cy}
        r={NODE.r}
        fill={nodeFill}
        className="tp-rise"
        style={{ animationDelay: '760ms' }}
      />

      {annotated && (
        <g
          fontFamily="var(--font-mono)"
          className="tp-rise"
          style={{ animationDelay: '760ms' }}
          letterSpacing="0.09em"
        >
          <text x="26" y="60" fill={labelInk} fontSize="13">
            PUBLIC LEDGER
          </text>
          <text x="26" y="94" fill={labelMuted} fontSize="12" letterSpacing="0.02em">
            status · commitment
          </text>

          <text x="494" y="60" fill={labelInk} fontSize="13" textAnchor="end">
            PRIVATE STATE
          </text>
          <text
            x="494"
            y="94"
            fill={labelMuted}
            fontSize="12"
            textAnchor="end"
            letterSpacing="0.02em"
          >
            amount · memo · parties
          </text>

          <text x={NODE.cx} y="308" fill={labelInk} fontSize="13" textAnchor="middle">
            VERIFIED SETTLEMENT
          </text>
          <text
            x={NODE.cx}
            y="330"
            fill={labelMuted}
            fontSize="12"
            textAnchor="middle"
            letterSpacing="0.02em"
          >
            anyone can check it
          </text>
        </g>
      )}
    </svg>
  );
}
