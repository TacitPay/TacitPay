import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import 'lenis/dist/lenis.css';

// Momentum scrolling for the marketing surface, driven off the same clock as
// the landing animation. Lenis writes the viewport position every frame; GSAP's
// ticker is what calls it, so scroll position and every scrubbed timeline are
// resolved once per frame instead of racing each other across two loops.
//
// It is deliberately NOT mounted on the app routes. A working tool with forms,
// dropdowns and long tables should scroll exactly as the operating system says
// it does; inertia is a reading pleasure, not an input one.

// GSAP's own defaults, read from gsap-core rather than remembered. The ticker
// is global, so leaving lag smoothing off after teardown would quietly change
// every other animation in the app.
const GSAP_LAG_THRESHOLD = 500;
const GSAP_ADJUSTED_LAG = 33;

let active: Lenis | null = null;

/** The running instance, or null on surfaces that scroll natively. */
export const getSmoothScroll = () => active;

/** Starts momentum scrolling. Returns the teardown. */
export function startSmoothScroll(): () => void {
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({
    // Lenis reads `prefers-reduced-motion` itself and drops to 1:1 tracking
    // when it is set, so there is no branch to write here.
    lerp: 0.09,
    // Lenis owns anchor clicks. Left to the browser they would animate the
    // same scrollTop Lenis is writing each frame, and the two would fight.
    // No offset: Lenis subtracts the root's `scroll-padding-top` itself, so the
    // 4rem already in index.css clears the sticky header. Passing one as well
    // lands every anchor a header-height too low.
    anchors: true,
    // Phones already have momentum, tuned per device by people with the
    // hardware. Adding ours on top makes it worse, not smoother.
    syncTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);

  // gsap.ticker reports seconds; lenis.raf expects milliseconds.
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  // Any lag correction here shows up as the scroll position jumping ahead of
  // the wheel, which reads as a dropped frame rather than a recovered one.
  gsap.ticker.lagSmoothing(0);

  active = lenis;

  return () => {
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(GSAP_LAG_THRESHOLD, GSAP_ADJUSTED_LAG);
    lenis.destroy();
    active = null;
  };
}
