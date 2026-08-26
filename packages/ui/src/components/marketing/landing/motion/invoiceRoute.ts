import { gsap } from 'gsap';

import { connectLoop, getLoopUi, type MotionCleanup } from './liveLoop';

/**
 * Geometry lives here rather than in the markup so the timeline and the SVG
 * cannot drift apart. The section imports these coordinates to draw the rail;
 * the timeline below moves a packet along the same numbers.
 */
export const ROUTE = {
  width: 1200,
  height: 214,
  railY: 120,
  railStart: 120,
  railEnd: 1124,
  stations: [
    { x: 180, label: 'Create', value: 'commitment 0x41d9\u20267e02' },
    { x: 480, label: 'Share', value: 'link #fragment \u00b7 never sent' },
    { x: 780, label: 'Settle', value: 'shielded transfer \u00b7 PAID' },
    { x: 1060, label: 'Verify', value: 'read by anyone \u00b7 no wallet' },
  ],
} as const;

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

  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6 });
  const span = ROUTE.railEnd - ROUTE.railStart;

  // Rest state: the rail is drawn but nothing has travelled it yet.
  timeline
    .set(packet, { attr: { cx: ROUTE.railStart }, opacity: 0 })
    .set(progress, { scaleX: 0, transformOrigin: 'left center' })
    .set(nodes.filter(Boolean), { opacity: 0.28, scale: 1, transformOrigin: 'center center' })
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
        { attr: { cx: station.x }, duration: TIMING.hop, ease: 'power1.inOut' },
        index === 0 ? '<' : undefined,
      )
      .to(progress, { scaleX: reached, duration: TIMING.hop, ease: 'power1.inOut' }, '<')
      // The station lights as the packet arrives, not before.
      .to(node, { opacity: 1, scale: 1.35, duration: 0.16, ease: 'power3.out' }, '>-0.05')
      .to(node, { scale: 1, duration: 0.22, ease: 'power2.out' })
      .to(value, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, '<')
      .call(() => ui.setReadout(station.label.toLowerCase(), station.value), undefined, '<')
      .to({}, { duration: TIMING.dwell });
  });

  // Fade out rather than snapping back: the invoice is done, not rewound.
  timeline
    .to(packet, { opacity: 0, duration: TIMING.reset, ease: 'power2.in' })
    .to(
      [...nodes.filter(Boolean), ...values.filter(Boolean)],
      { opacity: 0.28, duration: TIMING.reset, ease: 'power2.in' },
      '<',
    );

  return connectLoop(asset, timeline, ui, 'route ready', 'illustrative sequence');
};
