import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { RefObject } from 'react';

import { animateChainLedger } from './motion/chainLedger';
import { ASSETS } from './motion/registry';
import type { MotionCleanup } from './motion/liveLoop';
import { animateTerminatorPulse } from './motion/terminatorPulse';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/* SPLASH RESOLVE STORYBOARD
 *   0ms  the shell, the lockup and the actions are already in the DOM
 * 120ms  the terminator opens across the full width, and the public disc lands
 * 300ms  the wordmark settles beside it
 * 560ms  the promise and the actions settle
 * 620ms  the shielded ring DRAWS itself around the disc — growing out of the
 *        disc's shoulder, over the top and round, tucking in at its lower edge
 * 1380ms the settlement node lights, last: the one point both sides agree on
 *
 * The order is the argument. The ledger's disc exists first, the shielded
 * state is drawn around it, and the single point they agree on is what the
 * closed line produces — so the node cannot light before the ring has closed,
 * and the ring cannot be drawn before there is something to draw it around.
 *
 * Motion never owns visibility here: every tween is a `from`, so the resting
 * state is what the markup already says. Turning on reduced motion tears the
 * whole thing down and leaves the page exactly as it reads without JavaScript.
 */
const RESOLVE = {
  terminator: 0.12,
  wordmark: 0.3,
  details: 0.56,
  ring: 0.62,
  node: 1.38,
} as const;

/** How long the ring takes to draw its visible round. `inOut` rather than the
 *  `power3.out` the rest of the resolve uses: a drawn line wants to leave and
 *  arrive at rest, where an object that travels wants to arrive at rest only. */
const DRAW = { duration: 0.85, ease: 'power2.inOut' } as const;

const setupLandingMotion = (root: HTMLElement): MotionCleanup => {
  let loops: MotionCleanup[] = [];
  let disposed = false;

  const context = gsap.context(() => {
    const splash = root.querySelector<HTMLElement>('[data-tp-splash]');
    const beam = root.querySelector<HTMLElement>('[data-tp-beam]');
    const lockup = root.querySelector<HTMLElement>('[data-tp-lockup]');
    const fields = gsap.utils.toArray<HTMLElement>('[data-tp-field]', root);
    const grounds = root.querySelector<HTMLElement>('[data-tp-grounds]');
    const promise = root.querySelector<HTMLElement>('[data-tp-promise]');
    const markRing = root.querySelector<SVGCircleElement>('[data-tp-mark-ring]');

    // ---------------------------------------------------------- load resolve
    if (splash && beam && lockup) {
      const resolve = gsap.timeline();
      resolve
        .from(
          beam,
          { scaleX: 0.4, opacity: 0, duration: 0.9, ease: 'power3.out' },
          RESOLVE.terminator,
        )
        .from(
          '[data-tp-mark-disc]',
          { scale: 0.86, opacity: 0, duration: 0.5, ease: 'power3.out' },
          RESOLVE.terminator,
        )
        .from(
          '[data-tp-wordmark]',
          { x: -18, opacity: 0, duration: 0.7, ease: 'power3.out' },
          RESOLVE.wordmark,
        )
        .from(
          '[data-tp-mark-node]',
          { scale: 0, opacity: 0, duration: 0.4, ease: 'back.out(2.4)' },
          RESOLVE.node,
        )
        // THE ECLIPSE ITSELF. The ring is not moved into place at all — it is
        // DRAWN, and drawn FROM the disc: SplashLockup rotates the path so it
        // starts where the ring leaves the disc's cover, and hands over two
        // numbers. `data-tp-draw` is the full dash, which hides the line;
        // `data-tp-draw-tuck` is the offset where the tip has swept the whole
        // visible round and sits tucked back in under the disc. Tweening to
        // the tuck rather than to zero puts the ease's settle on the tuck-in
        // itself; the instant set then finishes the still-hidden remainder,
        // under the disc where the two states render identically.
        //
        // No fade rides along with it. A stroke that draws itself is already
        // its own reveal, and fading it in at the same time reads as two
        // separate things happening to one shape.
        .fromTo(
          markRing ? [markRing] : [],
          { strokeDashoffset: markRing?.dataset.tpDraw },
          {
            strokeDashoffset: markRing?.dataset.tpDrawTuck,
            duration: DRAW.duration,
            ease: DRAW.ease,
          },
          RESOLVE.ring,
        )
        .set(markRing ? [markRing] : [], { strokeDashoffset: 0 }, '>')
        .from(
          '[data-tp-splash-detail]',
          { y: 14, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 },
          RESOLVE.details,
        );

      // ------------------------------------------------------- scroll scrub
      // Scrolling does not merely move the splash away — it compresses the
      // terminator down into the hairline that rules the sections below.
      const scrub = gsap.timeline({
        scrollTrigger: { trigger: splash, start: 'top top', end: 'bottom top', scrub: 0.4 },
      });
      // Every leg is a `fromTo` that renders nothing until it is scrolled, and
      // that is a correctness fix rather than a style. A plain `to` samples the
      // DOM for its start values the first time it renders — and the resolve
      // above has these same elements pinned at ITS `from` state right then. On
      // a first visit the sampling happens to land after the resolve has
      // finished, so the scrub records the resting state and the hero looks
      // right. On a remount — browser Back onto the landing, or an HMR update —
      // it samples mid-resolve and records `scaleX: 0.4, opacity: 0` as the
      // terminator's "top of page" state. Scrolling back up then restores an
      // invisible line, and only a reload clears it. Authoring both ends means
      // the scrub never reads the DOM at all, so it cannot inherit that.
      const held = { ease: 'none', immediateRender: false };
      scrub
        .fromTo(
          beam,
          { opacity: 1, scaleX: 1 },
          { opacity: 0.34, scaleX: 0.18, transformOrigin: 'center center', ...held },
          0,
        )
        .fromTo(
          lockup,
          { opacity: 1, scale: 1, yPercent: 0 },
          { opacity: 0.72, scale: 0.965, yPercent: -6, ...held },
          0,
        );
      // The field drifts slower than the page, which reads as depth rather
      // than as movement — about one grid square across the whole splash.
      if (fields.length)
        scrub.fromTo(
          fields,
          { yPercent: 0, opacity: 1 },
          { yPercent: -4, opacity: 0.35, ...held },
          0,
        );
      // The grounds dissolve as the splash leaves. At rest they carry no fade
      // at all — the static bottom fade read as a grey band under the promise
      // lines — so this scrub IS the dissolve, and with motion off the halves
      // simply stay solid. Short duration, gentle ease-in: underway within the
      // first fifth of the scroll and FULLY dissolved just past halfway, so
      // the gesture reads as the fade rather than as a long hold — one full
      // linear fade parked a half-dissolved grey slab mid-viewport, and one
      // full-length ease-in made the visitor scroll most of a screen before
      // anything appeared to happen.
      if (grounds)
        scrub.fromTo(
          grounds,
          { opacity: 1 },
          { opacity: 0, duration: 0.28, ease: 'power1.in', immediateRender: false },
          0,
        );
      // The promise exits first (0.16 against the grounds' 0.28): its ink is
      // composited in `difference`, and a half-dissolved dark ground passes
      // through exactly the mid-grey where difference returns mid-grey — the
      // words must be gone before the ground gets there, or they ghost out
      // instead of fading.
      if (promise)
        scrub.fromTo(promise, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.16, ...held }, 0);
    }

    // ------------------------------------------------------ closing eclipse
    // The splash resolves its mark on load; the closer resolves the same mark
    // on arrival, so the eclipse is only whole once the argument above it has
    // been made. `fromTo` with `immediateRender: false` for the same reason the
    // splash scrub uses it: a `to` would sample whatever the DOM happened to
    // hold on its first render and could record the parted ring as the resting
    // state, leaving the mark permanently broken on a remount.
    const cta = root.querySelector<HTMLElement>('[data-tp-cta]');
    const ctaRing = root.querySelector<HTMLElement>('[data-tp-cta-ring]');
    if (cta && ctaRing) {
      gsap.fromTo(
        ctaRing,
        { xPercent: 9, opacity: 0.25 },
        {
          xPercent: 0,
          opacity: 1,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: cta,
            start: 'top bottom',
            end: 'center center',
            scrub: 0.6,
          },
        },
      );
    }

    // --------------------------------------------------------------- reveals
    gsap.utils.toArray<HTMLElement>('[data-tp-reveal]', root).forEach((element) => {
      gsap.from(element, {
        opacity: 0,
        y: 18,
        duration: 0.72,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      });
    });

    // ------------------------------------------------------------ instruments
    loops = gsap.utils.toArray<SVGSVGElement>('[data-tp-asset]', root).map((asset) => {
      const animate = ASSETS[asset.dataset.tpAsset ?? ''];
      return animate ? animate(asset) : () => undefined;
    });
    // Not in the registry: these find their own targets, and the ledger card
    // is HTML rather than an SVG instrument.
    loops.push(animateChainLedger(root));
    loops.push(animateTerminatorPulse(root));
  }, root);

  // ScrollTrigger caches every start and end at creation time, and the document
  // is not done growing then: web fonts reflow the copy and late images add
  // height. With stale measurements the splash scrub can sit pinned at its END
  // state on a page nobody has scrolled — terminator squeezed to nothing, line
  // ends faded out, which reads as the hero simply missing. Re-measure once the
  // page has actually settled.
  const refresh = () => {
    if (!disposed) ScrollTrigger.refresh();
  };
  window.addEventListener('load', refresh);
  document.fonts?.ready.then(refresh).catch(() => undefined);

  return () => {
    disposed = true;
    window.removeEventListener('load', refresh);
    context.revert();
    loops.forEach((cleanup) => cleanup());
  };
};

export const useLandingMotion = (scope: RefObject<HTMLDivElement | null>) => {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      let stopMotion: MotionCleanup | undefined;

      // A plain media listener rather than gsap.matchMedia: ScrollTrigger's
      // global refresh would jump the visitor's scroll position on toggle.
      const sync = () => {
        stopMotion?.();
        stopMotion = reduced.matches ? undefined : setupLandingMotion(root);
      };

      sync();
      reduced.addEventListener('change', sync);

      // Vite swaps a section's DOM on a hot update, but this effect does not
      // re-run — so GSAP goes on driving elements that have left the document.
      // Every loop then looks frozen while its readout keeps ticking, because
      // the `.call()` steps that write the readout need no element at all. That
      // reads as a broken instrument and has twice been reported as one.
      //
      // Re-establishing on `vite:afterUpdate` costs nothing in a build:
      // `import.meta.hot` is undefined there and the whole block is dropped.
      // The frame's delay lets React commit the new markup first, so the fresh
      // setup queries elements that are actually mounted.
      let hotFrame = 0;
      const rebuild = () => {
        cancelAnimationFrame(hotFrame);
        hotFrame = requestAnimationFrame(sync);
      };
      import.meta.hot?.on('vite:afterUpdate', rebuild);

      return () => {
        cancelAnimationFrame(hotFrame);
        import.meta.hot?.off('vite:afterUpdate', rebuild);
        reduced.removeEventListener('change', sync);
        stopMotion?.();
      };
    },
    { scope },
  );
};
