import { gsap } from 'gsap';

import { connectLoop, getLoopUi, type MotionCleanup } from './liveLoop';

/**
 * Geometry lives here rather than in the markup so the timeline and the SVG
 * cannot drift apart. The section imports these coordinates to draw the rail;
 * the timeline below moves a packet along the same numbers.
 */
export const ROUTE = {
  width: 1200,
  height: 240,
  railY: 126,
  railStart: 108,
  railEnd: 1092,
  /** Radius of the bay each station sits in. The rail runs behind them. */
  bay: 32,
  /** Spacing of the rail's gradations. A bare line reads as a placeholder; a
   *  graduated one reads as a track something is measured along. */
  tick: 28,
  // Captions read as prose, not as machine output: the corridor instrument is
  // where the ledger's own field names and hashes belong.
  stations: [
    { x: 180, label: 'Create', value: 'a commitment, never the amount' },
    { x: 476, label: 'Share', value: 'details travel inside the link' },
    { x: 772, label: 'Settle', value: 'marked paid on chain' },
    { x: 1020, label: 'Verify', value: 'anyone can check, no wallet' },
  ],
} as const;

/** How far a station is dimmed before the invoice has reached it. The old 0.28
 *  was mechanically correct and visually useless: a white ring at 28% on a dark
 *  ground still reads as lit, so all four stations looked the same and the
 *  sequence carried no information. */
const PENDING = { bay: 0.16, glyph: 0.13 } as const;

const TIMING = {
  enter: 0.5,
  hop: 0.72,
  dwell: 0.5,
  reset: 0.7,
} as const;

/** One invoice, from the moment it is drafted to the moment a stranger checks it. */
export const animateInvoiceRoute = (asset: SVGSVGElement): MotionCleanup => {
  const ui = getLoopUi(asset, 'invoice-route');
  const packet = asset.querySelector<SVGGraphicsElement>('[data-tp-packet]');
  const progress = asset.querySelector<SVGGraphicsElement>('[data-tp-progress]');
  const nodes = ROUTE.stations.map((_, index) =>
    asset.querySelector<SVGGraphicsElement>(`[data-tp-station="${index}"]`),
  );
  const values = ROUTE.stations.map((_, index) =>
    asset.querySelector<SVGGraphicsElement>(`[data-tp-value="${index}"]`),
  );
  // The glyph inside each bay. Animated apart from the bay ring so the ring can
  // pop on arrival without dragging the icon's own scale around with it.
  const glyphs = ROUTE.stations.map((_, index) =>
    asset.querySelector<SVGGraphicsElement>(`[data-tp-glyph="${index}"]`),
  );
  // The settled copy of each bay, cross-faded over the pending one as the
  // invoice arrives. See RouteSection for why it is a second layer rather than
  // a colour tween.
  const lits = ROUTE.stations.map((_, index) =>
    asset.querySelector<SVGGraphicsElement>(`[data-tp-lit="${index}"]`),
  );
  // Rides from bay to bay with the invoice. A settled station says which ones
  // are DONE; this says which one is happening now.
  const marker = asset.querySelector<SVGGraphicsElement>('[data-tp-marker]');

  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6 });
  const span = ROUTE.railEnd - ROUTE.railStart;

  // Rest state: the rail is drawn but nothing has travelled it yet.
  timeline
    .set(packet, { attr: { x: ROUTE.railStart - 7 }, opacity: 0 })
    .set(progress, { scaleX: 0, opacity: 1, transformOrigin: 'left center' })
    .set(nodes.filter(Boolean), {
      opacity: PENDING.bay,
      scale: 1,
      transformOrigin: 'center center',
    })
    .set(glyphs.filter(Boolean), { opacity: PENDING.glyph })
    .set(lits.filter(Boolean), { opacity: 0, scale: 0.86, transformOrigin: 'center center' })
    .set(marker, {
      attr: { cx: ROUTE.stations[0].x },
      opacity: 0,
      scale: 0.72,
      transformOrigin: 'center center',
    })
    .set(values.filter(Boolean), { opacity: 0, y: 6 })
    .call(() => ui.setReadout('drafting', 'nothing on chain yet'))
    .to(packet, { opacity: 1, duration: TIMING.enter, ease: 'power2.out' });

  ROUTE.stations.forEach((station, index) => {
    const node = nodes[index];
    const value = values[index];
    const reached = (station.x - ROUTE.railStart) / span;

    timeline
      .to(
        packet,
        { attr: { x: station.x - 7 }, duration: TIMING.hop, ease: 'power1.inOut' },
        index === 0 ? '<' : undefined,
      )
      .to(progress, { scaleX: reached, duration: TIMING.hop, ease: 'power1.inOut' }, '<')
      // The marker appears at the first station and travels with the invoice
      // after that, so "where it is now" never has to be inferred.
      .to(
        marker,
        index === 0
          ? { opacity: 1, scale: 1, duration: 0.34, ease: 'back.out(2)' }
          : { attr: { cx: station.x }, duration: TIMING.hop, ease: 'power1.inOut' },
        index === 0 ? '>-0.14' : '<',
      )
      // The station settles as the invoice arrives, not before. The pending
      // layer brightens underneath at the same time, so the couple of frames
      // before the settled ground is fully opaque are not a dim flash.
      .to(lits[index], { opacity: 1, scale: 1, duration: 0.34, ease: 'back.out(1.7)' }, '>-0.05')
      .to(node, { opacity: 1, duration: 0.2, ease: 'power2.out' }, '<')
      .to(glyphs[index], { opacity: 1, duration: 0.2, ease: 'power2.out' }, '<')
      .to(value, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '<')
      .call(() => ui.setReadout(station.label.toLowerCase(), station.value), undefined, '<')
      .to({}, { duration: TIMING.dwell });
  });

  // The cycle ends by COMPLETING THE RAIL, not with one more trip: after the
  // stranger's check the line runs on alone to the end of the track — the
  // record stands on its own from here — while the packet stays put. Sending
  // the circle off again past the last station read as a fifth, phantom stop.
  timeline
    .to(progress, { scaleX: 1, duration: TIMING.hop, ease: 'power1.inOut' })
    .to({}, { duration: TIMING.dwell });

  // The outro is a dissolve and NOTHING ELSE: every piece fades where it
  // stands, opacity only, all together. Anything that still moves here reads
  // as one more event after the story is over — a marker that shrank as it
  // faded was read as exactly that — while no outro at all read as a dropped
  // frame. Hold the finished picture, dissolve it evenly, start fresh; the
  // rest-state sets do their work under an empty stage.
  timeline
    .to(packet, { opacity: 0, duration: TIMING.reset, ease: 'power2.in' })
    .to(marker, { opacity: 0, duration: TIMING.reset, ease: 'power2.in' }, '<')
    .to(lits.filter(Boolean), { opacity: 0, duration: TIMING.reset, ease: 'power2.in' }, '<')
    .to(
      nodes.filter(Boolean),
      { opacity: PENDING.bay, duration: TIMING.reset, ease: 'power2.in' },
      '<',
    )
    .to(
      glyphs.filter(Boolean),
      { opacity: PENDING.glyph, duration: TIMING.reset, ease: 'power2.in' },
      '<',
    )
    .to(values.filter(Boolean), { opacity: 0, duration: TIMING.reset, ease: 'power2.in' }, '<')
    .to(progress, { opacity: 0, duration: TIMING.reset, ease: 'power2.in' }, '<');

  return connectLoop(asset, timeline, ui, 'route ready', 'illustrative sequence');
};
