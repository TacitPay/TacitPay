import { gsap } from 'gsap';

import { connectLoop, getLoopUi, type LoopTimeline, type MotionCleanup } from './liveLoop';

/**
 * The four circuits, as an instrument. A candidate invoice runs one route past
 * three gates; each gate is the mark itself, closing into an eclipse when it
 * passes. Every fourth pass the expiry gate holds and the invoice takes the
 * `cancelInvoice` rail instead — because a cancelled invoice is an outcome the
 * contract supports, not a failure of it.
 *
 * Stages carry ordinals, never timings: nothing here is measured.
 */
export const INTERLOCK = {
  width: 1200,
  height: 264,
  mainY: 104,
  divertY: 214,
  entryX: 96,
  exitX: 1040,
  chipX: 1072,
  radius: 13,
  /** Rest offset of disc and ring: the mark, eclipsed. Authored into the SVG. */
  gateRest: 5,
  /** How far GSAP pulls them apart for an open gate, relative to that rest. */
  gateOpen: 13,
  gates: [
    { x: 336, circuit: 'createInvoice', check: 'commitment written, amount withheld' },
    { x: 626, circuit: 'payInvoice', check: 'preimage matches \u00b7 not expired' },
    { x: 916, circuit: 'withdraw', check: 'proven from the merchant secret' },
  ],
  /** The gate that holds on a diverting cycle: expiry is what cancellation is for. */
  divertAt: 1,
  divertCircuit: 'cancelInvoice',
  /** Where the packet leaves the main rail when that gate holds. */
  divertFromX: 596,
  /** Passing cycles per diverting cycle, so the happy path stays the norm. */
  passesPerDivert: 3,
} as const;

const TIMING = {
  enter: 0.4,
  travel: 0.66,
  gate: 0.3,
  drop: 0.42,
  exit: 0.7,
  dwell: 0.42,
  clear: 0.5,
} as const;

type Ui = ReturnType<typeof getLoopUi>;

interface GateParts {
  readonly disc: SVGGraphicsElement | null;
  readonly ring: SVGGraphicsElement | null;
  readonly node: SVGGraphicsElement | null;
  readonly held: SVGGraphicsElement | null;
}

/** Adds one full pass of the route to `timeline`, either clean or diverting. */
const addCycle = (
  timeline: LoopTimeline,
  asset: SVGSVGElement,
  ui: Ui,
  gates: readonly GateParts[],
  diverts: boolean,
) => {
  const packet = asset.querySelector<SVGGraphicsElement>('[data-tp-ip-packet]');
  const divertRail = asset.querySelector<SVGGraphicsElement>('[data-tp-divert-rail]');
  const passExit = asset.querySelector<SVGGraphicsElement>('[data-tp-exit="pass"]');
  const divertExit = asset.querySelector<SVGGraphicsElement>('[data-tp-exit="divert"]');
  const open = INTERLOCK.gateOpen;
  const closed = 0;

  timeline
    .set(packet, { attr: { cx: INTERLOCK.entryX, cy: INTERLOCK.mainY }, opacity: 0 })
    .set([passExit, divertExit].filter(Boolean), { opacity: 0.22 })
    .set(divertRail, { opacity: diverts ? 0.32 : 0.1 })
    .call(() => ui.setReadout('candidate', 'invoice enters the route'))
    .to(packet, { opacity: 1, duration: TIMING.enter, ease: 'power2.out' });

  // Reset every gate to open before the run, so a repeat starts honest.
  gates.forEach((gate) => {
    timeline
      .set(gate.disc, { x: -open }, '<')
      .set(gate.ring, { x: open }, '<')
      .set(gate.node, { opacity: 0 }, '<')
      .set(gate.held, { opacity: 0 }, '<');
  });

  for (let index = 0; index < INTERLOCK.gates.length; index += 1) {
    const spec = INTERLOCK.gates[index];
    const gate = gates[index];
    const holdsHere = diverts && index === INTERLOCK.divertAt;

    timeline
      .to(packet, {
        attr: { cx: spec.x - 46 },
        duration: TIMING.travel,
        ease: 'power1.inOut',
      })
      .call(() => ui.setReadout(spec.circuit, spec.check));

    if (holdsHere) {
      // The gate stays apart and says so; the packet does not squeeze through.
      timeline
        .to(gate.held, { opacity: 1, duration: TIMING.gate, ease: 'power2.out' })
        .to(packet, { attr: { cx: INTERLOCK.divertFromX }, duration: 0.16, ease: 'power2.out' })
        .call(() => ui.setReadout(INTERLOCK.divertCircuit, 'expired — escrow returns to the payer'))
        .to(divertRail, { opacity: 0.8, duration: 0.24, ease: 'power2.out' }, '<')
        .to(packet, {
          attr: { cy: INTERLOCK.divertY },
          duration: TIMING.drop,
          ease: 'power2.inOut',
        })
        .to(packet, {
          attr: { cx: INTERLOCK.exitX },
          duration: TIMING.exit,
          ease: 'power1.inOut',
        })
        .to(divertExit, { opacity: 1, duration: 0.24, ease: 'power2.out' }, '>-0.2')
        .to({}, { duration: TIMING.dwell })
        .to(packet, { opacity: 0, duration: TIMING.clear, ease: 'power2.in' })
        .to(
          [gate.held, divertExit].filter(Boolean),
          { opacity: 0.22, duration: TIMING.clear, ease: 'power2.in' },
          '<',
        );
      return;
    }

    // A passing gate closes into the eclipse: disc and ring meet, node lights.
    timeline
      .to(gate.disc, { x: -closed, duration: TIMING.gate, ease: 'power3.out' })
      .to(gate.ring, { x: closed, duration: TIMING.gate, ease: 'power3.out' }, '<')
      .to(gate.node, { opacity: 1, duration: 0.18, ease: 'power2.out' }, '>-0.12')
      .to(packet, { attr: { cx: spec.x + 46 }, duration: 0.34, ease: 'power2.inOut' });
  }

  timeline
    .to(packet, { attr: { cx: INTERLOCK.exitX }, duration: TIMING.exit, ease: 'power1.inOut' })
    .call(() => ui.setReadout('settled', 'merchant withdrew · nothing disclosed'))
    .to(passExit, { opacity: 1, duration: 0.24, ease: 'power2.out' }, '>-0.2')
    .to({}, { duration: TIMING.dwell })
    .to(packet, { opacity: 0, duration: TIMING.clear, ease: 'power2.in' })
    .to(passExit, { opacity: 0.22, duration: TIMING.clear, ease: 'power2.in' }, '<');
};

export const animateCircuitInterlock = (asset: SVGSVGElement): MotionCleanup => {
  const ui = getLoopUi(asset, 'circuit-interlock');
  const gates: GateParts[] = INTERLOCK.gates.map((_, index) => ({
    disc: asset.querySelector(`[data-tp-gate-disc="${index}"]`),
    ring: asset.querySelector(`[data-tp-gate-ring="${index}"]`),
    node: asset.querySelector(`[data-tp-gate-node="${index}"]`),
    held: asset.querySelector(`[data-tp-gate-held="${index}"]`),
  }));

  // One timeline holding the whole rotation, rather than rebuilding per cycle:
  // the pause control and the teardown then have a single thing to own.
  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 });
  for (let pass = 0; pass < INTERLOCK.passesPerDivert; pass += 1) {
    addCycle(timeline, asset, ui, gates, false);
  }
  addCycle(timeline, asset, ui, gates, true);

  return connectLoop(asset, timeline, ui, 'interlock ready', 'illustrative sequence');
};
