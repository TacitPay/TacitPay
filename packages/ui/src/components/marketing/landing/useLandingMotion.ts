import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { RefObject } from 'react';

import { ASSETS } from './motion/registry';
import type { MotionCleanup } from './motion/liveLoop';
import { animateTerminatorPulse } from './motion/terminatorPulse';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/* SPLASH RESOLVE STORYBOARD
 *   0ms  the shell, the lockup and the actions are already in the DOM
 * 120ms  the terminator opens across the full width
 * 300ms  the shielded ring travels in and comes to rest over the public disc
 * 460ms  the settlement node lights — the one point both sides agree on
 * 560ms  the promise and the actions settle
 *
 * Motion never owns visibility here: every tween is a `from`, so the resting
 * state is what the markup already says. Turning on reduced motion tears the
 * whole thing down and leaves the page exactly as it reads without JavaScript.
 */
const RESOLVE = {
  terminator: 0.12,
  ring: 0.3,
  node: 0.46,
  details: 0.56,
} as const;

const setupLandingMotion = (root: HTMLElement): MotionCleanup => {
  let loops: MotionCleanup[] = [];
  let disposed = false;

  const context = gsap.context(() => {
    const splash = root.querySelector<HTMLElement>('[data-tp-splash]');
    const beam = root.querySelector<HTMLElement>('[data-tp-beam]');
    const lockup = root.querySelector<HTMLElement>('[data-tp-lockup]');
    const publicFlank = root.querySelector<HTMLElement>('[data-tp-flank="public"]');
    const privateFlank = root.querySelector<HTMLElement>('[data-tp-flank="private"]');
    const fields = gsap.utils.toArray<HTMLElement>('[data-tp-field]', root);

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
        // The eclipse itself: the shielded ring travels in over the public disc.
        .from(
          '[data-tp-mark-ring]',
          { x: 34, opacity: 0, duration: 0.85, ease: 'power3.out' },
          RESOLVE.ring,
        )
        .from(
          '[data-tp-wordmark]',
          { x: -18, opacity: 0, duration: 0.7, ease: 'power3.out' },
          RESOLVE.ring,
        )
        .from(
          '[data-tp-mark-node]',
          { scale: 0, opacity: 0, duration: 0.4, ease: 'back.out(2.4)' },
          RESOLVE.node,
        )
        .from(
          '[data-tp-splash-detail]',
          { y: 14, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 },
          RESOLVE.details,
        )
        .from(
          [publicFlank, privateFlank].filter(Boolean),
          { opacity: 0, duration: 0.9, ease: 'power2.out' },
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
      if (publicFlank)
        scrub.fromTo(publicFlank, { x: 0, autoAlpha: 1 }, { x: -44, autoAlpha: 0, ...held }, 0);
      if (privateFlank)
        scrub.fromTo(privateFlank, { x: 0, autoAlpha: 1 }, { x: 44, autoAlpha: 0, ...held }, 0);
      // The field drifts slower than the page, which reads as depth rather
      // than as movement — about one grid square across the whole splash.
      if (fields.length)
        scrub.fromTo(
          fields,
          { yPercent: 0, opacity: 1 },
          { yPercent: -4, opacity: 0.35, ...held },
          0,
        );
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
