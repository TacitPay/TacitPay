import { ArrowDown, ArrowRight } from 'iconsax-reactjs';
import { Link } from 'react-router-dom';

import { SplashLockup } from '../SplashLockup';

/**
 * The opening surface, and the only thing on it is identity.
 *
 * One lockup, optically centred on the terminator — the line where the public
 * ledger meets private state. No cards, no telemetry, no claims: the product
 * interface starts after the first scroll.
 *
 * The line is annotated at both ends the way EclipseMark annotates the mark:
 * what the public side holds, and what the private side keeps. These are the
 * real field names from the contract, not invented rows — an earlier version
 * put a fake ledger tape and fake redaction bars out here, which read as
 * decoration pretending to be data and told the visitor nothing.
 *
 * Every colour is a token, so the surface turns over with the theme. The
 * terminator is drawn from one channel triple at several alphas — near-black
 * ink on paper, silver on the void — which is why `--tp-glow` exists as raw
 * channels instead of a colour.
 */

/**
 * One end of the line: a label, a rule bleeding in from the page edge, and a
 * drop onto the terminator.
 *
 * The L-shaped leader is EclipseMark's own annotation grammar — the same shape
 * it uses to point at the disc and the ring — so the splash reads as the same
 * technical drawing rather than as floating text.
 */
function LineEnd({
  side,
  title,
  holds,
}: {
  side: 'public' | 'private';
  title: string;
  holds: string;
}) {
  const isPublic = side === 'public';
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 hidden -translate-y-full xl:block ${
        isPublic ? 'left-0' : 'right-0'
      }`}
    >
      <div
        data-tp-flank={side}
        className={`flex flex-col ${isPublic ? 'items-start' : 'items-end'}`}
      >
        <p className="text-[0.625rem] font-medium tracking-[0.16em] text-tp-ink-faint uppercase">
          {title}
        </p>
        {/* Mono earns its place here: these are the ledger's own field names. */}
        <p className="mt-2 font-mono text-xs text-tp-ink-muted">{holds}</p>

        <div className="relative mt-4 h-9 w-full">
          {/* Runs out past the page edge; the section clips it. A rule that
              stops short reads as a box around the label. */}
          <span
            className={`absolute top-0 h-px bg-tp-rule-strong ${
              isPublic ? '-left-[50vw] right-0' : '-right-[50vw] left-0'
            }`}
          />
          {/* Drops onto the terminator at the inner end, so the label reads as
              measured off the line. Lit by the pulse. */}
          <span
            {...(isPublic ? { 'data-tp-flank-tick': true } : { 'data-tp-flank-draft': true })}
            className={`absolute top-0 h-9 w-px bg-tp-rule-strong ${isPublic ? 'right-0' : 'left-0'}`}
          />
        </div>
      </div>
    </div>
  );
}

export function BrandSplash() {
  return (
    <section
      data-tp-splash="true"
      aria-labelledby="splash-title"
      className="tp-grain relative isolate overflow-hidden border-b border-tp-rule bg-tp-surface"
    >
      {/* THE FIELD — the surface's texture, and it carries the same argument the
          rest of the page does rather than decorating around it.

          On the public side the measuring grid is whole. On the private side
          only its intersections survive: the structure is still legible, the
          content is not. Both halves fade to nothing before they reach the
          centre, so the lockup and the terminator keep a clean ground and the
          seam between the two treatments is never visible.

          Built from the same channel triple as the terminator, so it inverts
          with the theme; and from gradients rather than a canvas or a particle
          library, because a decorative dot field would be a look borrowed from
          every other landing page instead of this product's own idea. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 [mask-image:linear-gradient(to_bottom,transparent_0%,#000_16%,#000_84%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_16%,#000_84%,transparent_100%)]"
      >
        <div
          data-tp-field="public"
          className="absolute inset-y-0 right-1/2 left-0 overflow-hidden [mask-image:linear-gradient(to_right,#000_0%,transparent_88%)] [-webkit-mask-image:linear-gradient(to_right,#000_0%,transparent_88%)]"
        >
          {/* Overhangs by one cell at each edge so the drift never exposes a
              gap, and owns the transform so the scroll parallax on its parent
              is free to own its own. */}
          <div
            className="tp-field-inward absolute inset-y-0 -inset-x-11"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to right, rgb(var(--tp-glow)/0.055) 0 1px, transparent 1px 44px), repeating-linear-gradient(to bottom, rgb(var(--tp-glow)/0.055) 0 1px, transparent 1px 44px)',
            }}
          />
        </div>
        <div
          data-tp-field="private"
          className="absolute inset-y-0 right-0 left-1/2 overflow-hidden [mask-image:linear-gradient(to_left,#000_0%,transparent_88%)] [-webkit-mask-image:linear-gradient(to_left,#000_0%,transparent_88%)]"
        >
          <div
            className="tp-field-outward absolute inset-y-0 -inset-x-11"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, rgb(var(--tp-glow)/0.13) 1px, transparent 1.5px)',
              backgroundSize: '44px 44px',
            }}
          />
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-[92rem] flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
        {/* The lockup row. The terminator and both registers are anchored to it
            rather than to the section, so the line passes through the mark no
            matter how the copy below it reflows. */}
        <div className="relative flex w-full items-center justify-center">
          {/* THE TERMINATOR — the edge of the eclipse, and the page's one piece
              of brand furniture. Three layers: a diffuse corridor, a narrow
              band, and a crisp rail. The mask opens a hole in the middle so the
              line passes behind the lockup instead of striking through it. The
              window is viewport-relative, so it has to open wider on a narrow
              screen where the lockup takes up far more of the width.

              The outer element owns the centring and the mask; the inner one
              owns nothing but the scrub. Keeping them apart matters, because
              GSAP writes `transform` wholesale and would otherwise drop the
              CSS translate that centres this. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[clamp(5rem,9vw,9rem)] w-screen -translate-x-1/2 -translate-y-1/2 [-webkit-mask-image:linear-gradient(to_right,#000_0%,transparent_14%,transparent_86%,#000_100%)] [mask-image:linear-gradient(to_right,#000_0%,transparent_14%,transparent_86%,#000_100%)] sm:[-webkit-mask-image:linear-gradient(to_right,#000_0%,#000_5%,transparent_27%,transparent_73%,#000_95%,#000_100%)] sm:[mask-image:linear-gradient(to_right,#000_0%,#000_5%,transparent_27%,transparent_73%,#000_95%,#000_100%)]"
          >
            <div data-tp-beam="true" className="absolute inset-0">
              {/* Both wide layers are vertical gradients, not flat fills. A
                  filled rectangle with a shadow spread reads as a grey slab
                  with hard top and bottom edges — which is exactly what it
                  looked like before. Only the 1px rail keeps a glow, because a
                  hairline has no edge to give itself away. */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgb(var(--tp-glow)/0.07)_50%,transparent_100%)]" />
              <div className="absolute inset-x-0 top-1/2 h-[clamp(1.75rem,3.5vw,3.5rem)] -translate-y-1/2 bg-[linear-gradient(to_bottom,transparent_0%,rgb(var(--tp-glow)/0.16)_50%,transparent_100%)]" />
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[rgb(var(--tp-glow)/0.7)] shadow-[0_0_18px_4px_rgb(var(--tp-glow)/0.35)]" />

              {/* Same rule again: the wrapper centres, the packet translates.

                  Two layers, because a single 3px bar reads as a dash being
                  slid along a line rather than as light moving through one: a
                  soft elliptical halo that falls off in both axes, and a
                  hairline core sitting exactly on the rail. Neither takes a
                  transform of its own — GSAP owns the wrapper's. */}
              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
                <div data-tp-beam-packet className="relative h-3 w-44 opacity-0">
                  <div className="tp-flash-halo absolute inset-0" />
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(to_right,transparent,rgb(var(--tp-glow))_50%,transparent)]" />
                </div>
              </div>
            </div>
          </div>

          <LineEnd side="public" title="Public ledger" holds="status · commitment" />
          <LineEnd side="private" title="Private state" holds="amount · memo · parties" />

          <SplashLockup />
        </div>

        <div className="mt-12 flex max-w-3xl flex-col items-center">
          {/* The visible promise is one line; the heading stays for the document
              outline and for anyone listening rather than looking. */}
          <h1 id="splash-title" className="sr-only">
            TacitPay — private invoicing and settlement on Midnight
          </h1>
          <p
            data-tp-splash-detail
            className="max-w-lg text-base leading-7 text-balance text-tp-ink-muted"
          >
            Settlement anyone can verify. Numbers only you can read.
          </p>

          <div
            data-tp-splash-detail
            className="mt-9 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row"
          >
            <Link
              to="/app"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-xs font-semibold tracking-[0.12em] text-primary-foreground uppercase transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-tp-surface focus-visible:outline-none"
            >
              Get started
              <ArrowRight
                size={16}
                variant="Linear"
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <a
              href="#record"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-tp-rule-strong px-7 text-xs font-medium tracking-[0.12em] text-tp-ink-muted uppercase transition-colors hover:border-tp-ink-faint hover:text-tp-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-tp-surface focus-visible:outline-none"
            >
              See the line
              <ArrowDown size={16} variant="Linear" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
