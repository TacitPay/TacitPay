import { ArrowRight } from 'iconsax-reactjs';
import { Link } from 'react-router-dom';

import { SplashLockup } from '../SplashLockup';

/**
 * The opening surface, and the only thing on it is identity.
 *
 * One lockup, optically centred on the terminator — the line where the public
 * ledger meets private state. No cards, no telemetry, no claims: the product
 * interface starts after the first scroll.
 *
 * The surface is divided into two grounds at a VERTICAL terminator as well, so
 * the argument is in the paper before it is in the words: a light half for what
 * the ledger shows and a dark half for what only you can read. Public is always
 * the light ground; what turns over with the theme is which side it is on, so
 * the half that departs from the page is the dark panel on paper and the light
 * one on the void. The tokens for all of it live in index.css under THE SPLASH
 * SPLIT, and the ordering is driven by four of them rather than by JavaScript —
 * a resolved theme read in React would flash on first paint and would duplicate
 * what the media query already knows.
 *
 * The GROUNDS turn over, and so do the two line ends and the field treatments,
 * because a "public ledger" label on the private ground would simply be wrong.
 * The LOCKUP does not: identity is the one thing here that must not move when
 * the theme changes. That also keeps it in the page's own register, since the
 * left half is always the half matching `--tp-surface`.
 *
 * Nothing inside had to learn about the split. Everything here was already
 * written in `--tp-*`, so the `.tp-split-ink` group simply re-points those
 * tokens and composites in `difference`: each mark is then drawn as a departure
 * from whatever ground is behind it. The alternative — a second, masked copy of
 * the hero's content — would have had two of every GSAP hook on the page.
 *
 * NOTHING CROSSES THE TERMINATOR, and the layout exists to keep it that way.
 * The lockup is two columns split on the seam, the name is stacked so it fits
 * inside one of them, and the promise breaks at its own full stop. That is the
 * whole reason for the arrangement: an element spanning both grounds changes
 * colour halfway through itself, and a word that changes colour mid-word reads
 * as a rendering fault rather than as a design. Several attempts to cover that
 * up — a pool of the page's ground behind the copy, a frosted pane, a neutral
 * mid-grey plate — all failed for the same reason. They were built from one
 * half's own colour, so they read as one side bleeding into the other; and a
 * mid-grey plate cannot work under `difference` at all, since white differenced
 * against mid-grey comes back as mid-grey. Removing the crossing was the fix.
 * The terminator itself still crosses, and should: it is a line, and a line
 * that changes tone as it passes the eclipse edge is the point of it.
 *
 * The line is annotated at both ends the way EclipseMark annotates the mark:
 * what the public side holds, and what the private side keeps. These are the
 * real field names from the contract, not invented rows — an earlier version
 * put a fake ledger tape and fake redaction bars out here, which read as
 * decoration pretending to be data and told the visitor nothing.
 */

/**
 * One end of the line: a label, a rule bleeding in from the page edge, and a
 * drop onto the terminator.
 *
 * The L-shaped leader is EclipseMark's own annotation grammar — the same shape
 * it uses to point at the disc and the ring — so the splash reads as the same
 * technical drawing rather than as floating text.
 *
 * Placed with LOGICAL properties, never `left`/`right`. Outward is the inline
 * start for the public end and the inline end for the private one; the row's
 * `direction` decides which physical side that actually is, so both annotations
 * turn over with the theme without a single conditional in here.
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
      data-tp-flank={side}
      className={`flex flex-col ${isPublic ? 'items-start' : 'items-end'}`}
      // The scroll scrub pushes these off the page, and off is a different
      // direction on each side AND in each theme. It animates this variable
      // rather than `x` so the mirror can be applied here, in CSS, where the
      // theme is actually known — and so GSAP never owns this transform.
      style={{ transform: 'translateX(calc(var(--tp-flank-x, 0px) * var(--tp-split-flip)))' }}
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
            isPublic
              ? '[inset-inline-end:0] [inset-inline-start:-50vw]'
              : '[inset-inline-end:-50vw] [inset-inline-start:0]'
          }`}
        />
        {/* Drops onto the terminator at the inner end, so the label reads as
            measured off the line. Lit by the pulse. */}
        <span
          {...(isPublic ? { 'data-tp-flank-tick': true } : { 'data-tp-flank-draft': true })}
          className={`absolute top-0 h-9 w-px bg-tp-rule-strong ${
            isPublic ? '[inset-inline-end:0]' : '[inset-inline-start:0]'
          }`}
        />
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
      {/* THE TWO GROUNDS — the only thing on the splash painted as a colour
          rather than as a departure from one. Everything else is drawn over it
          in the group below.

          Off below `sm`. The whole hero is arranged so that nothing crosses the
          terminator, and that arrangement needs two columns wide enough to hold
          a mark and a name; a phone has no such width. With this layer gone the
          section falls back to its own `bg-tp-surface`, and the difference group
          then resolves to exactly the register the rest of the page uses — so
          the fallback costs nothing and needs no second set of colours. */}
      <div
        aria-hidden="true"
        className="tp-split pointer-events-none absolute inset-0 -z-30 hidden sm:block"
      />

      {/* THE FIELD — the surface's texture, and it carries the same argument
          the rest of the page does rather than decorating around it.

          On the public side the measuring grid is whole. On the private side
          only its intersections survive: the structure is still legible, the
          content is not. Both halves fade to nothing before they reach the
          centre, so the lockup and the terminator keep a clean ground and the
          seam between the two treatments is never visible.

          A flex row rather than two positioned halves, so the pair reverses
          with the ground it belongs to. The fade always runs toward the
          centre, which is `--tp-split-dir` for the public half and its
          opposite for the private one — a gradient direction is the one thing
          here that cannot simply be negated.

          Built from gradients rather than a canvas or a particle library,
          because a decorative dot field would be a look borrowed from every
          other landing page instead of this product's own idea. */}
      <div
        aria-hidden="true"
        className="tp-split-ink pointer-events-none absolute inset-0 -z-20 flex [flex-direction:var(--tp-split-flow)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_16%,#000_84%,transparent_100%)] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_16%,#000_84%,transparent_100%)]"
      >
        <div
          data-tp-field="public"
          className="relative flex-1 overflow-hidden [-webkit-mask-image:linear-gradient(var(--tp-split-dir),#000_0%,transparent_88%)] [mask-image:linear-gradient(var(--tp-split-dir),#000_0%,transparent_88%)]"
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
          className="relative flex-1 overflow-hidden [-webkit-mask-image:linear-gradient(var(--tp-split-back),#000_0%,transparent_88%)] [mask-image:linear-gradient(var(--tp-split-back),#000_0%,transparent_88%)]"
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
        {/* The lockup row. The terminator and both registers are anchored to
            it rather than to the section, so the line passes through the mark
            no matter how the copy below it reflows. */}
        <div className="relative flex w-full items-center justify-center">
          {/* THE TERMINATOR — the edge of the eclipse, and the page's one
              piece of brand furniture. Three layers: a diffuse corridor, a
              narrow band, and a crisp rail. The mask opens a hole in the
              middle so the line passes behind the lockup instead of striking
              through it. The window is viewport-relative, so it has to open
              wider on a narrow screen where the lockup takes up far more of
              the width.

              The outer element owns the centring and the mask; the inner one
              owns nothing but the scrub. Keeping them apart matters, because
              GSAP writes `transform` wholesale and would otherwise drop the
              CSS translate that centres this. */}
          <div
            aria-hidden="true"
            className="tp-split-ink pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[clamp(5rem,9vw,9rem)] w-screen -translate-x-1/2 -translate-y-1/2 [-webkit-mask-image:linear-gradient(to_right,#000_0%,transparent_14%,transparent_86%,#000_100%)] [mask-image:linear-gradient(to_right,#000_0%,transparent_14%,transparent_86%,#000_100%)] sm:[-webkit-mask-image:linear-gradient(to_right,#000_0%,#000_5%,transparent_27%,transparent_73%,#000_95%,#000_100%)] sm:[mask-image:linear-gradient(to_right,#000_0%,#000_5%,transparent_27%,transparent_73%,#000_95%,#000_100%)]"
          >
            <div data-tp-beam="true" className="absolute inset-0">
              {/* Both wide layers are vertical gradients, not flat fills. A
                  filled rectangle with a shadow spread reads as a grey slab
                  with hard top and bottom edges — which is exactly what it
                  looked like before. Only the 1px rail keeps a glow, because
                  a hairline has no edge to give itself away. */}
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

          {/* Both line ends in one row, so they swap sides with the grounds
              they annotate. `direction` is what does it: it reverses the row
              AND flips every logical property inside each end. */}
          <div
            aria-hidden="true"
            className="tp-split-ink pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-full justify-between [direction:var(--tp-split-rtl)] xl:flex"
          >
            <LineEnd side="public" title="Public ledger" holds="status · commitment" />
            <LineEnd side="private" title="Private state" holds="amount · memo · parties" />
          </div>

          <SplashLockup className="tp-split-ink" />
        </div>

        <div className="mt-12 flex w-full max-w-3xl flex-col items-center sm:max-w-none">
          {/* The visible promise is one line; the heading stays for the
              document outline and for anyone listening rather than looking. */}
          <h1 id="splash-title" className="sr-only">
            TacitPay — private invoicing and settlement on Midnight
          </h1>
          {/* The promise, below `sm` only: the split is off on a phone, so the
              two sentences run together as one centred line here in the stack.
              From `sm` up each clause moves to the bottom centre of its own
              ground — that copy lives at the END of the section, because it
              must centre on the VIEWPORT's halves and this column caps at
              92rem. Only one of the two copies is ever displayed, so screen
              readers never hear the promise twice. */}
          <p
            data-tp-splash-detail
            className="tp-split-ink max-w-lg text-lg leading-8 text-balance text-tp-ink-muted sm:hidden"
          >
            <span>Settlement anyone can verify.</span> <span>Numbers only you can read.</span>
          </p>

          {/* One action, centred — so it is the only thing on the splash that
              sits ON the terminator rather than beside it. That is why it is
              NOT in a `.tp-split-ink` group and does not use `--primary`: it
              carries a literal mid grey that reads against both halves, with
              white type. See `--tp-split-action` for why grey is the only
              colour that can do that, and why the pair cannot survive the
              difference blend.

              The second action was a scroll cue down to `#record`; the primary
              nav still links there, so the anchor did not go anywhere. */}
          <div data-tp-splash-detail className="mt-9 flex w-full justify-center">
            <Link
              to="/app"
              className="tp-action-flash group inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[var(--tp-split-action)] px-7 ring-1 ring-white/15 ring-inset text-xs font-semibold tracking-[0.12em] text-[var(--tp-split-action-ink)] uppercase transition-colors hover:bg-[var(--tp-split-action-hover)] focus-visible:ring-2 focus-visible:ring-[var(--tp-split-action-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tp-split-action)] focus-visible:outline-none sm:w-auto"
            >
              Get started
              <ArrowRight
                size={16}
                variant="Linear"
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* The promise, from `sm` up. The two clauses were always the public
          claim and the private one, so each sits at the BOTTOM CENTRE of the
          ground it describes — "anyone can verify" on the public half, "only
          you can read" on the private half — set larger than body copy so the
          pairing reads as the splash's argument, not a caption. They swap with
          the grounds via `--tp-split-flow`, because pinning them would put
          "anyone can verify" under PRIVATE STATE in one theme.

          A direct child of the SECTION rather than the content column: the
          halves belong to the viewport, and the column caps at 92rem, so
          centring inside it would drift off the halves on a wide screen. The
          bottom offset keeps the text above the ground's bottom fade (solid
          until 84% of the section's height). */}
      <p
        data-tp-splash-detail
        className="tp-split-ink pointer-events-none absolute inset-x-0 bottom-[clamp(6rem,17vh,10.5rem)] hidden text-tp-ink sm:flex sm:[flex-direction:var(--tp-split-flow)]"
      >
        <span className="flex-1 basis-0 px-[clamp(1.5rem,4vw,3rem)] text-center text-[clamp(1.2rem,1.85vw,1.8rem)] leading-snug font-medium tracking-[-0.01em] text-balance">
          Settlement anyone can verify.
        </span>
        <span className="flex-1 basis-0 px-[clamp(1.5rem,4vw,3rem)] text-center text-[clamp(1.2rem,1.85vw,1.8rem)] leading-snug font-medium tracking-[-0.01em] text-balance">
          Numbers only you can read.
        </span>
      </p>
    </section>
  );
}
