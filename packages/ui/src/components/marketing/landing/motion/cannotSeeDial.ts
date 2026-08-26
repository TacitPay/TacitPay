import { gsap } from 'gsap';

import { connectLoop, getLoopUi, type MotionCleanup } from './liveLoop';

/* THE CANNOT-SEE DIAL
 *
 * One timeline drives the index and every station, and that is the entire point
 * of it not being CSS. As three separate CSS animations held in step only by
 * matching `animation-delay`, they shared a phase but not a clock: anything
 * that restarted one and not the others — an HMR update, an element being
 * recreated — desynced them for good, and the readout ended up announcing a
 * station the index was nowhere near.
 *
 * A station's cue is derived from its own bearing rather than authored, so the
 * interrogation lands exactly when the index arrives, by construction.
 */

/** One revolution. Slower than it needs to be for the movement's own sake: at
 *  9s the index had already travelled 80° past a station by the time its answer
 *  was legible, which is what made the two look unrelated. */
const REVOLUTION = 15;
/** How long an answer stands. 1.8s is ~43° of travel, so the index is still
 *  visibly at the station the reader is looking at. */
const HOLD = 1.8;

const REST_OPACITY = 0.7;
const QUERIED_OPACITY = 0.26;

export const animateCannotSeeDial = (asset: SVGSVGElement): MotionCleanup => {
  const index = asset.querySelector<SVGGElement>('[data-tp-dial-index]');
  const sockets = gsap.utils.toArray<SVGRectElement>('[data-tp-dial-socket]', asset);
  const answers = gsap.utils.toArray<SVGTextElement>('[data-tp-dial-answer]', asset);
  const origin = asset.dataset.tpDialCentre ?? '0 0';

  if (!index || !sockets.length) return () => undefined;

  // The markup rests in the state a reader with reduced motion should see:
  // every station legible and every answer standing. Motion is what takes them
  // away, so nothing here can leave the diagram half-drawn.
  gsap.set(sockets, { opacity: REST_OPACITY });
  gsap.set(answers, { opacity: 0 });

  const timeline = gsap.timeline({ repeat: -1, paused: true });

  timeline.to(index, { rotation: 360, svgOrigin: origin, duration: REVOLUTION, ease: 'none' }, 0);

  sockets.forEach((socket, station) => {
    const bearing = Number(socket.dataset.tpDialSocket ?? 0);
    const arrives = (REVOLUTION * bearing) / 360;
    const answer = answers[station];
    // A station near the end of the sweep is still answering when the loop
    // comes round, so its clearing cue wraps to the top of the next pass. On
    // the first pass that lands on an answer already hidden, which is a no-op.
    const clears = (arrives + HOLD) % REVOLUTION;

    // Interrogated: the mount reads as LESS present, never more. A contact that
    // brightens under a sweep means it was found, which is the opposite claim.
    timeline.to(socket, { opacity: QUERIED_OPACITY, scale: 0.92, duration: 0.28 }, arrives);
    timeline.to(socket, { opacity: REST_OPACITY, scale: 1, duration: 0.45 }, clears);

    if (answer) {
      timeline.to(answer, { opacity: 1, duration: 0.25 }, arrives + 0.05);
      timeline.to(answer, { opacity: 0, duration: 0.4 }, clears);
    }
  });

  // Pins the loop to exactly one revolution; without it the last station's cues
  // would set the duration and the rotation would fall behind a little more on
  // every pass.
  timeline.set({}, {}, REVOLUTION);

  return connectLoop(
    asset,
    timeline,
    getLoopUi(asset, 'cannot-see-dial'),
    'dial ready',
    'no station fitted',
  );
};
