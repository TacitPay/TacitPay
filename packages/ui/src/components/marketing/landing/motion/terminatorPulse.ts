import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import type { MotionCleanup } from './liveLoop';

/* TERMINATOR PULSE STORYBOARD
 *  0.00s  the private end of the line ticks: a commitment is being drafted
 *  0.45s  it fires from the private end toward the settlement node
 *  0.80s  the lockup blooms as it crosses — the only moment both sides touch
 *  1.35s  it re-emerges on the public side, carrying nothing but a status
 *  1.75s  the public end of the line ticks to receive it
 *
 * The whole product is this one gesture: private data goes in, a public fact
 * comes out, and the numbers never make the crossing. Two things keep it from
 * reading as a loop: the gap between crossings is random, and so is the pace of
 * each one (see `PACE` below), so no two are the same length or the same speed.
 */
export const PULSE = {
  firstDelay: 1.1,
  idleMin: 1.1,
  idleMax: 2.6,
  draftAt: 0,
  draftDuration: 0.34,
  fireAt: 0.45,
  fireDuration: 0.46,
  bloomAt: 0.8,
  bloomHalf: 0.26,
  bloomOpacity: 0.4,
  emergeAt: 1.35,
  emergeDuration: 0.5,
  tickAt: 1.75,
  tickHalf: 0.2,
  settleAt: 2.5,
  settleDuration: 0.4,
  cycleEnd: 2.95,
} as const;

/** How much each crossing's pace may vary from the storyboard above. Cheaper
 *  and more convincing than randomising nine durations independently: the whole
 *  gesture speeds up or slows down together, the way a real one would. */
const PACE = { min: 0.82, max: 1.24 };

/** Where the packet sits, as a fraction of half the splash width, measured out
 *  from the centre. The mask owns the middle, so the packet is only ever seen
 *  outside ±0.22. */
const PRIVATE_START = 0.94;
const PRIVATE_END = 0.2;
const PUBLIC_START = -0.2;
const PUBLIC_END = -0.9;

export const animateTerminatorPulse = (root: HTMLElement): MotionCleanup => {
  const splash = root.querySelector<HTMLElement>('[data-tp-splash]');
  const packet = root.querySelector<HTMLElement>('[data-tp-beam-packet]');
  const bloom = root.querySelector<HTMLElement>('[data-tp-lockup-bloom]');

  if (!splash || !packet || !bloom) return () => undefined;

  // The annotated line ends are optional furniture — below `xl` they are not
  // rendered at all, and the pulse still has to run without them.
  const draft = root.querySelector<HTMLElement>('[data-tp-flank-draft]');
  const tick = root.querySelector<HTMLElement>('[data-tp-flank-tick]');

  // Half the splash width, read fresh on every cycle so a resize mid-visit does
  // not leave the packet travelling to a stale coordinate.
  const reach = () => splash.getBoundingClientRect().width / 2;

  let pending: number | null = PULSE.firstDelay;
  let scheduled: ReturnType<typeof gsap.delayedCall> | undefined;
  let destroyed = false;
  // Tracked as a plain flag rather than read off the trigger: the trigger is
  // created after the predicate that needs it, and the splash is already on
  // screen at load, so its initial state has to be read explicitly below.
  let onScreen = false;

  const timeline = gsap.timeline({
    paused: true,
    onComplete: () => {
      pending = gsap.utils.random(PULSE.idleMin, PULSE.idleMax);
      schedule();
    },
  });

  const canPlay = () => !destroyed && !document.hidden && onScreen;

  function runCycle() {
    if (!canPlay()) return;
    pending = null;
    // `invalidate` re-reads the function-based coordinates so a resize mid-visit
    // is picked up; the timeScale is what stops the cadence sounding metronomic.
    timeline.timeScale(gsap.utils.random(PACE.min, PACE.max));
    timeline.invalidate().restart();
  }

  function schedule() {
    if (!canPlay() || pending === null || scheduled) return;
    scheduled = gsap.delayedCall(pending, () => {
      scheduled = undefined;
      if (canPlay()) runCycle();
    });
  }

  function halt() {
    scheduled?.kill();
    scheduled = undefined;
    timeline.pause();
  }

  function resume() {
    if (!canPlay()) return;
    if (timeline.progress() > 0 && timeline.progress() < 1) timeline.play();
    else if (pending === null) pending = gsap.utils.random(PULSE.idleMin, PULSE.idleMax);
    schedule();
  }

  timeline
    // The private end ticks: something is being drafted over there.
    .fromTo(
      draft ? [draft] : [],
      { scaleY: 0.15, opacity: 0.35, transformOrigin: 'bottom center' },
      { scaleY: 1, opacity: 1, duration: PULSE.draftDuration, ease: 'power2.out' },
      PULSE.draftAt,
    )
    // The commitment crosses from the private end into the masked gate.
    .fromTo(
      packet,
      { x: () => reach() * PRIVATE_START, opacity: 0 },
      {
        x: () => reach() * PRIVATE_END,
        opacity: 1,
        duration: PULSE.fireDuration,
        ease: 'power2.in',
      },
      PULSE.fireAt,
    )
    // Both sides touch for exactly one moment, and it is the mark that shows it.
    .fromTo(
      bloom,
      { opacity: 0, scale: 0.97 },
      { opacity: PULSE.bloomOpacity, scale: 1, duration: PULSE.bloomHalf, ease: 'power2.out' },
      PULSE.bloomAt,
    )
    .to(
      bloom,
      { opacity: 0, scale: 1.04, duration: PULSE.bloomHalf, ease: 'power2.in' },
      PULSE.bloomAt + PULSE.bloomHalf,
    )
    // What comes out the public side is a status and nothing else.
    .fromTo(
      packet,
      { x: () => reach() * PUBLIC_START, opacity: 1 },
      {
        x: () => reach() * PUBLIC_END,
        opacity: 0,
        duration: PULSE.emergeDuration,
        ease: 'power2.out',
      },
      PULSE.emergeAt,
    )
    .fromTo(
      tick ? [tick] : [],
      { scaleY: 0.15, opacity: 0.35, transformOrigin: 'bottom center' },
      { scaleY: 1, opacity: 1, duration: PULSE.tickHalf, ease: 'power3.out' },
      PULSE.tickAt,
    )
    .to(
      [tick, draft].filter(Boolean),
      { opacity: 0.55, duration: PULSE.settleDuration, ease: 'sine.inOut' },
      PULSE.settleAt,
    )
    // A hard endpoint keeps `onComplete` honest even when every flank is absent.
    .set({}, {}, PULSE.cycleEnd);

  const visibility = ScrollTrigger.create({
    trigger: splash,
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => {
      onScreen = true;
      resume();
    },
    onEnterBack: () => {
      onScreen = true;
      resume();
    },
    onLeave: () => {
      onScreen = false;
      halt();
    },
    onLeaveBack: () => {
      onScreen = false;
      halt();
    },
  });
  onScreen = visibility.isActive;

  const syncTabVisibility = () => (document.hidden ? halt() : resume());
  document.addEventListener('visibilitychange', syncTabVisibility);

  schedule();

  return () => {
    destroyed = true;
    document.removeEventListener('visibilitychange', syncTabVisibility);
    scheduled?.kill();
    visibility.kill();
    timeline.kill();
  };
};
