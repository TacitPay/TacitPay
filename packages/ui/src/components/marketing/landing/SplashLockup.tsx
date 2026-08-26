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
      // Two equal columns from `sm` up, so the boundary between them lands on
      // the splash's terminator at 50% at EVERY width: the mark hugs it from
      // one side and the name from the other, and neither ever crosses. That
      // is what lets the lockup keep one colour per piece — before this the
      // seam ran straight through the middle of the word.
      //
      // Deliberately does NOT reverse with the two grounds. Identity is the one
      // thing here that must not move when the theme changes, so the mark stays
      // left of the name in every register — see the note on the <svg> below
      // for what that buys beyond the obvious.
      //
      // Below `sm` the split is off (see BrandSplash) and this collapses back
      // to a plain centred row, because two columns of a phone's width cannot
      // hold a mark and a name side by side.
      className={`relative isolate inline-flex items-center justify-center gap-[clamp(0.9rem,2.2vw,1.6rem)] sm:grid sm:w-full sm:grid-cols-2 sm:gap-[clamp(1.4rem,3vw,2.6rem)] ${className}`}
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
        // Never mirrored, and that also settles the mark's colour for free.
        // The splash's light half is on the LEFT on paper and on the RIGHT on
        // the void, so the left half is always the one matching the page's own
        // ground — which means a lockup pinned to the left always renders in
        // the register the rest of the page is already in, and the mark here
        // agrees with the header logo sitting sixty pixels above it. Mirroring
        // it put the disc on the opposite ground from that logo in dark mode.
        //
        // Sized against the STACKED name rather than a single line of it —
        // roughly 174px against 179px at 1512. At the old size it read as a
        // small badge parked beside a big word instead of half of one lockup.
        className="h-[clamp(5rem,11.5vw,11rem)] w-auto shrink-0 sm:justify-self-end"
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

      {/* Stacked, not set on one line. Two lines keep the name inside a single
          column of the spine at every width, and the terminator then passes
          through the gap between them rather than behind a run of type.
          Leading is pulled under 1 so the two words read as one block. */}
      <span
        data-tp-wordmark
        className="flex flex-col font-sans text-[clamp(3.4rem,7vw,6.5rem)] leading-[0.86] font-semibold tracking-[-0.045em] text-tp-ink sm:justify-self-start"
      >
        <span>Tacit</span>
        <span className="font-normal text-tp-ink-faint">Pay</span>
      </span>
    </div>
  );
}
