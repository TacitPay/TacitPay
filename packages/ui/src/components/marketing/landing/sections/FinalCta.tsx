import { ArrowRight, SearchNormal1 } from 'iconsax-reactjs';
import { Link } from 'react-router-dom';

import { Reveal } from '../shared';

/**
 * The closing beat, and a bookend to the splash.
 *
 * The page opens with the mark resolving on the terminator as it loads. It ends
 * with the same two shapes, except the eclipse completes as the reader arrives:
 * the shielded ring drifts over the public disc on scroll, so the mark is only
 * whole once the argument above it has been made. The line runs in from both
 * edges and disappears behind the copy, exactly as it does at the top.
 *
 * Everything here is drawn from the brand's own two circles. Nothing is invented
 * for decoration, and there is no fabricated invoice or link — this page spent a
 * whole session removing that kind of thing once already.
 */
export function FinalCta() {
  return (
    <section data-tp-cta className="tp-grain relative overflow-hidden bg-tp-surface-alt">
      {/* The eclipse, at the scale of the section and near the floor of what is
          visible. It is a ground for the copy, not a picture behind it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <svg
          viewBox="0 0 700 520"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-auto"
        >
          {/* Paint order is the mark's own: the shielded ring is a background
              line and the public disc sits in front of it. */}
          <g data-tp-cta-ring>
            <circle cx="410" cy="260" r="168" stroke="rgb(var(--tp-glow)/0.16)" strokeWidth="2" />
          </g>
          <circle cx="290" cy="260" r="168" fill="rgb(var(--tp-glow)/0.05)" />
        </svg>
      </div>

      {/* The terminator, entering from both edges and passing behind the copy —
          the same mask the splash uses, opened wider because there is more text
          to keep clear here.

          Gone below `sm`: at 390 the paragraph runs nearly edge to edge, so the
          only place the line can show is across the ends of its own lines. A
          hairline with no room to be a line is just a scratch through text. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-px -translate-y-1/2 bg-[rgb(var(--tp-glow)/0.4)] [-webkit-mask-image:linear-gradient(to_right,#000_0%,transparent_24%,transparent_76%,#000_100%)] [mask-image:linear-gradient(to_right,#000_0%,transparent_24%,transparent_76%,#000_100%)] sm:block"
      />

      <div className="relative mx-auto max-w-[92rem] px-5 py-24 text-center sm:px-8 md:py-32">
        <Reveal>
          <h2 className="mx-auto max-w-3xl font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl">
            Issue an invoice that proves itself.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-tp-ink-muted">
            Create one in the browser, send the link, and let anyone confirm it settled — without
            handing them your ledger.
          </p>

          {/* Two doors, because the page has two kinds of reader by now: someone
              issuing an invoice, and someone who was sent one. */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/app"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-xs font-semibold tracking-[0.12em] text-primary-foreground uppercase transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Get started
              <ArrowRight
                size={16}
                variant="Linear"
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              to="/app#verify"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-tp-rule-strong px-7 text-xs font-medium tracking-[0.12em] text-tp-ink-muted uppercase transition-colors hover:border-tp-ink-faint hover:text-tp-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-tp-surface focus-visible:outline-none"
            >
              Verify one you were sent
              <SearchNormal1 size={16} variant="Linear" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
