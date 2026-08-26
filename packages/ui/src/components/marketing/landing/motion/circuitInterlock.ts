import { gsap } from 'gsap';

import { connectLoop, getLoopUi, type LoopTimeline, type MotionCleanup } from './liveLoop';

/**
 * The four circuits as a disclosure matrix: what each one takes in against what
 * it writes out, with the terminator between the two halves.
 *
 * Earlier attempts drew this as a route — which made it a near-copy of the
 * invoice route two sections above — and then as one gate with a queue beside
 * it. Both showed the ORDER of the circuits. Neither showed the thing the
 * section actually claims, which is not about order at all: that nothing on the
 * private side of the line ever appears on the public side.
 *
 * Every cell is read off contracts/tacitpay.compact. `takes` is what the
 * circuit accepts as private input, witnesses included; `writes` is what it
 * actually puts in the ledger. payInvoice recomputes the commitment to CHECK it
 * and withdraw recomputes the owner tag to CHECK it, so neither writes one —
 * which is why those cells are empty rather than filled.
 *
 * Stages carry ordinals, never timings: nothing here is measured.
 */

interface Circuit {
  readonly circuit: string;
  /** For the panel readout. */
  readonly check: string;
  /** Private inputs, in TAKES column order. */
  readonly takes: readonly boolean[];
  /** Ledger writes, in WRITES column order. */
  readonly writes: readonly boolean[];
  readonly status: string;
  /** The fourth circuit: it runs only when the expiry check holds. */
  readonly branch?: boolean;
}

const CIRCUITS: readonly Circuit[] = [
  {
    circuit: 'createInvoice',
    check: 'commitment written, amount withheld',
    takes: [true, true, true, true],
    writes: [true, true],
    status: 'OPEN',
  },
  {
    circuit: 'payInvoice',
    check: 'preimage matches · not expired',
    takes: [true, true, true, true],
    writes: [false, true],
    status: 'PAID',
  },
  {
    circuit: 'withdraw',
    check: 'proven from the merchant secret',
    takes: [false, false, false, true],
    writes: [false, false],
    status: 'WITHDRAWN',
  },
  {
    circuit: 'cancelInvoice',
    check: 'expired · escrow returns to the payer',
    takes: [false, false, false, true],
    writes: [false, false],
    status: 'CANCELLED',
    branch: true,
  },
];

export const INTERLOCK = {
  width: 880,
  height: 336,
  circuitX: 24,
  groupY: 40,
  headerY: 68,
  ruleY: 84,
  /** Column centres. The names are the contract's own. */
  takes: [
    { x: 236, label: 'amount' },
    { x: 318, label: 'memoHash' },
    { x: 392, label: 'salt' },
    { x: 458, label: 'secret' },
  ],
  writes: [
    { x: 580, label: 'commitment' },
    { x: 664, label: 'tag' },
  ],
  /** The terminator, stood on end: the page's own line between the two sides. */
  dividerX: 512,
  statusX: 716,
  rows: [120, 174, 228, 282],
  circuits: CIRCUITS,
  /** Index of the check that holds on a diverting cycle. */
  divertAt: 1,
  /** Index of the circuit that runs instead when it does. */
  divertTo: 3,
  /** Passing cycles per diverting cycle, so the happy path stays the norm. */
  passesPerDivert: 3,
} as const;

const PENDING = 0.2;

const TIMING = {
  enter: 0.34,
  row: 0.3,
  takes: 0.34,
  read: 0.46,
  writes: 0.36,
  dwell: 0.5,
  clear: 0.5,
} as const;

type Ui = ReturnType<typeof getLoopUi>;

interface Parts {
  readonly rows: readonly (SVGGraphicsElement | null)[];
  readonly takes: readonly (SVGGraphicsElement | null)[];
  readonly writes: readonly (SVGGraphicsElement | null)[];
  readonly statuses: readonly (SVGGraphicsElement | null)[];
  readonly held: SVGGraphicsElement | null;
  readonly divider: SVGGraphicsElement | null;
}

/** Runs one circuit's row. `holds` leaves the write side of the line empty. */
const runRow = (timeline: LoopTimeline, ui: Ui, parts: Parts, index: number, holds: boolean) => {
  const spec = INTERLOCK.circuits[index];

  timeline
    .to(parts.rows[index], { opacity: 1, duration: TIMING.row, ease: 'power2.out' })
    .call(() => ui.setReadout(spec.circuit, spec.check))
    // What goes in.
    .to(parts.takes[index], { opacity: 1, duration: TIMING.takes, ease: 'power2.out' }, '<')
    .to({}, { duration: TIMING.read });

  if (holds) {
    timeline.to(parts.held, { opacity: 1, duration: 0.26, ease: 'power2.out' });
    return;
  }

  // What comes out. The divider brightens as the line is crossed, which is the
  // only moment in the whole loop where anything is written at all.
  timeline
    .to(parts.divider, { opacity: 1, duration: 0.22, ease: 'power2.out' })
    .to(parts.writes[index], { opacity: 1, duration: TIMING.writes, ease: 'power2.out' }, '<')
    .to(parts.statuses[index], { opacity: 1, duration: TIMING.writes, ease: 'power2.out' }, '<')
    .to(parts.divider, { opacity: 0.55, duration: 0.5, ease: 'power2.inOut' });
};

/** Adds one full pass over the circuits, either clean or diverting. */
const addCycle = (timeline: LoopTimeline, ui: Ui, parts: Parts, diverts: boolean) => {
  timeline
    .set(parts.rows.filter(Boolean), { opacity: PENDING })
    .set([...parts.takes, ...parts.writes, ...parts.statuses].filter(Boolean), { opacity: 0 })
    .set(parts.held, { opacity: 0 })
    .set(parts.divider, { opacity: 0.55 })
    .call(() => ui.setReadout('candidate', 'nothing written yet'))
    .to({}, { duration: TIMING.enter });

  for (let index = 0; index < 3; index += 1) {
    const holds = diverts && index === INTERLOCK.divertAt;
    runRow(timeline, ui, parts, index, holds);

    if (holds) {
      timeline.to({}, { duration: TIMING.dwell });
      runRow(timeline, ui, parts, INTERLOCK.divertTo, false);
      timeline
        .to({}, { duration: TIMING.dwell })
        .to(parts.held, { opacity: 0.22, duration: TIMING.clear, ease: 'power2.in' });
      return;
    }
  }

  timeline
    .call(() => ui.setReadout('settled', 'four circuits · nothing disclosed'))
    .to({}, { duration: TIMING.dwell });
};

export const animateCircuitInterlock = (asset: SVGSVGElement): MotionCleanup => {
  const ui = getLoopUi(asset, 'circuit-interlock');
  const byIndex = (name: string) =>
    INTERLOCK.circuits.map((_, index) =>
      asset.querySelector<SVGGraphicsElement>(`[data-tp-${name}="${index}"]`),
    );

  const parts: Parts = {
    rows: byIndex('row'),
    takes: byIndex('takes'),
    writes: byIndex('writes'),
    statuses: byIndex('status'),
    held: asset.querySelector('[data-tp-held]'),
    divider: asset.querySelector('[data-tp-divider]'),
  };

  // One timeline holding the whole rotation, rather than rebuilding per cycle:
  // the pause control and the teardown then have a single thing to own.
  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6 });
  for (let pass = 0; pass < INTERLOCK.passesPerDivert; pass += 1) {
    addCycle(timeline, ui, parts, false);
  }
  addCycle(timeline, ui, parts, true);

  return connectLoop(asset, timeline, ui, 'interlock ready', 'illustrative sequence');
};
