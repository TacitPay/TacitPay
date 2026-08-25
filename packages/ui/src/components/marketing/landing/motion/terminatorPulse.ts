import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import type { MotionCleanup } from './liveLoop';

/* TERMINATOR PULSE STORYBOARD
 *  0.45s  a commitment fires from the private end toward the settlement node
 *  0.80s  it slips behind the lockup — the crossing itself shows NOTHING: the
 *         centre is deliberately effect-free, identity never reacts
 *  1.35s  it re-emerges on the public side, carrying nothing but a status
 *
 * (The annotated line ends this used to tick are gone — the pulse is now the
 * packet alone, and the lead-in beat before 0.45 is deliberate breath.)
 *
 * The whole product is this one gesture: private data goes in, a public fact
 * comes out, and the numbers never make the crossing. Two things keep it from
 * reading as a loop: the gap between crossings is random, and so is the pace of
 * each one (see `PACE` below), so no two are the same length or the same speed.
 *
 * The idle gaps are short on purpose — a crossing lands every ~3-4s. At the
 * original 1.1-2.6s idle the line sat inert long enough that the gesture read
 * as an occasional glitch rather than as the line's own activity.
 */
export const PULSE = {
  firstDelay: 0.6,
  idleMin: 0.35,
  idleMax: 1.2,
  fireAt: 0.45,
  fireDuration: 0.46,
  emergeAt: 1.35,
  emergeDuration: 0.5,
  /* Unchanged from when the tick-and-settle tail existed, so the measured
     cadence (a crossing every ~3-4s) stays exactly what it was. */
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

  if (!splash || !packet) return () => undefined;

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
    // The crossing itself is silent: the packet slips behind the lockup with
    // no bloom and no glow. The centre never reacts — see SplashLockup.
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
    // A hard endpoint keeps `onComplete` honest with nothing after the emerge.
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
