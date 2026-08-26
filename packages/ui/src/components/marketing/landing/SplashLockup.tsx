// The mark at display size. Same three shapes, same proportions and — crucially
// — the same paint order as components/Logo.tsx: the shielded ring is a
// BACKGROUND line and the public disc sits in front of it. Drawing the ring
// last, as this file and EclipseMark both used to, lays its stroke across the
// face of the disc and the lockup stops matching the header logo.
//
// Every colour is a token, so the mark turns over with the theme: on paper the
// disc is near-black with a light node, on the void it is the other way round.
// Each shape carries its own hook, because the load sequence is the brand's own
// gesture — the ring travels in and comes to rest against the disc.

const DISC = { cx: 200, cy: 170, r: 80 };
const RING = { cx: 280, cy: 170, r: 80 };
const NODE = { cx: (DISC.cx + RING.cx) / 2, cy: 170, r: 15 };

export function SplashLockup({ className = '' }: { className?: string }) {
  return (
    <div
      data-tp-lockup="true"
      className={`relative isolate inline-flex items-center justify-center gap-[clamp(0.9rem,2.2vw,1.6rem)] ${className}`}
    >
      {/* Lit only while a commitment crosses the terminator, by the pulse. */}
      <div
        data-tp-lockup-bloom
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[clamp(9rem,20vw,17rem)] w-[clamp(20rem,42vw,42rem)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgb(var(--tp-glow)/0.3)_0%,transparent_70%)] opacity-0"
      />

      <svg
        viewBox="112 82 256 176"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="h-[clamp(4.5rem,8vw,7rem)] w-auto shrink-0"
      >
        {/* 1. Shielded state — the background line. */}
        <circle
          data-tp-mark-ring
          cx={RING.cx}
          cy={RING.cy}
          r={RING.r}
          stroke="var(--tp-mark-ring)"
          strokeWidth="5"
        />
        {/* 2. Public ledger — the solid foreground disc, over the ring. */}
        <circle data-tp-mark-disc cx={DISC.cx} cy={DISC.cy} r={DISC.r} fill="var(--tp-ink)" />
        {/* 3. The one point both sides agree on. */}
        <circle data-tp-mark-node cx={NODE.cx} cy={NODE.cy} r={NODE.r} fill="var(--tp-surface)" />
      </svg>

      <span
        data-tp-wordmark
        className="font-sans text-[clamp(3.4rem,7vw,6.5rem)] leading-none font-semibold tracking-[-0.045em] text-tp-ink"
      >
        Tacit<span className="font-normal text-tp-ink-faint">Pay</span>
      </span>
    </div>
  );
}
