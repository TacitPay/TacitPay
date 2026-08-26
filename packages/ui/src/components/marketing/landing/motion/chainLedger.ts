import { gsap } from 'gsap';

import { connectLoop, getLoopUi, type MotionCleanup } from './liveLoop';

/**
 * The ledger card being written, over and over: four values arrive whole, four
 * redaction bars are laid down where a value would go, the finished card
 * stands, and the cycle clears.
 *
 * The field labels never move — the ledger's structure is public either way,
 * and a label that blinked in and out would claim otherwise. Only the content
 * column animates, because arriving content is the entire argument.
 *
 * Same discipline as the other instruments: the markup is authored COMPLETE
 * and the timeline empties it at the start of a run, so reduced motion and
 * teardown are always left holding the whole card.
 */

const TIMING = {
  /** Empty beat before the first value lands. */
  open: 0.3,
  /** One value arriving. */
  write: 0.26,
  /** Row cadence while the public four are written. */
  stagger: 0.24,
  /** Pause at the divide between written values and withheld ones. */
  divide: 0.22,
  /** One redaction bar being laid down. */
  stamp: 0.2,
  /** Bar cadence. */
  stampGap: 0.2,
  /** The finished card stands long enough to be read. */
  hold: 2,
  clear: 0.4,
} as const;

export const animateChainLedger = (root: HTMLElement): MotionCleanup => {
  const card = root.querySelector<HTMLElement>('[data-tp-ledger]');
  if (!card) return () => undefined;

  const values = gsap.utils.toArray<HTMLElement>('[data-tp-ledger-value]', card);
  const bars = gsap.utils.toArray<HTMLElement>('[data-tp-ledger-bar]', card);
  if (!values.length || !bars.length) return () => undefined;

  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.25 });

  timeline
    .set(values, { opacity: 0, x: 10 })
    .set(bars, { opacity: 0, scaleX: 0, transformOrigin: 'right center' })
    .to({}, { duration: TIMING.open });

  // The public four are written in ledger order, each sliding in from the
  // right because that is where the value column reads from.
  values.forEach((value, index) => {
    timeline.to(
      value,
      { opacity: 1, x: 0, duration: TIMING.write, ease: 'power2.out' },
      TIMING.open + index * TIMING.stagger,
    );
  });

  // The bars grow right-to-left from the value edge: a redaction laid down
  // where a value would have started, not a value being covered up.
  const stampsBegin = TIMING.open + values.length * TIMING.stagger + TIMING.divide;
  bars.forEach((bar, index) => {
    timeline.to(
      bar,
      { opacity: 1, scaleX: 1, duration: TIMING.stamp, ease: 'power3.out' },
      stampsBegin + index * TIMING.stampGap,
    );
  });

  // The outro dissolves everything evenly where it stands — the route rail's
  // rule: anything still moving after the story is over reads as one more event.
  timeline
    .to({}, { duration: TIMING.hold })
    .to([...values, ...bars], { opacity: 0, duration: TIMING.clear, ease: 'power2.in' });

  return connectLoop(
    card,
    timeline,
    getLoopUi(card, 'chain-ledger'),
    'ledger at rest',
    'illustrative fields',
  );
};
