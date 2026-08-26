import { gsap } from 'gsap';

import { connectLoop, getLoopUi, type MotionCleanup } from './liveLoop';

export interface CorridorRow {
  readonly y: number;
  readonly key: string;
  readonly value: string;
  /** True when the field is written to the public ledger verbatim. */
  readonly crosses: boolean;
  /** Width of the bar the chain gets instead, for fields that are held. */
  readonly redact: number;
}

/**
 * The disclosure corridor. Left of the wall is your device, right of it is the
 * chain, and the wall is the only thing between them. Four fields cross it
 * whole; four never cross at all — the chain is handed a blank, not a cipher.
 *
 * The geometry is shared with the section that draws it, so the wall in the
 * picture is the same wall the packets stop against.
 */
export const CORRIDOR = {
  width: 1200,
  height: 500,
  wallX: 812,
  wallTop: 58,
  wallBottom: 482,
  keyX: 140,
  valueX: 300,
  headerY: 40,
  ruleY: 58,
  dividerY: 278,
  /** Where a packet leaves the device column, and the two places it can end. */
  packetStartX: 566,
  packetCrossX: 898,
  packetHeldX: 782,
  ledgerX: 898,
  groups: [
    { label: 'Crosses the boundary', y: 88 },
    { label: 'Never crosses', y: 308 },
  ],
  rows: [
    { y: 118, key: 'invoice_id', value: '0x8f3a\u2026c21b', crosses: true, redact: 0 },
    { y: 158, key: 'status', value: 'PAID', crosses: true, redact: 0 },
    { y: 198, key: 'expires_at', value: '2026-09-30', crosses: true, redact: 0 },
    { y: 238, key: 'commitment', value: '0x41d9\u20267e02', crosses: true, redact: 0 },
    { y: 338, key: 'amount', value: '1,240.00 tDUST', crosses: false, redact: 104 },
    { y: 378, key: 'memo', value: 'Design retainer \u2014 August', crosses: false, redact: 142 },
    { y: 418, key: 'merchant', value: 'mn_shield\u20269f2c', crosses: false, redact: 92 },
    { y: 458, key: 'payer', value: 'mn_shield\u20264a71', crosses: false, redact: 92 },
  ] as readonly CorridorRow[],
} as const;

const TIMING = {
  travel: 0.62,
  stagger: 0.26,
  land: 0.28,
  hold: 1.9,
  clear: 0.6,
} as const;

export const animateDisclosureCorridor = (asset: SVGSVGElement): MotionCleanup => {
  const ui = getLoopUi(asset, 'disclosure-corridor');
  const wall = asset.querySelector<SVGGraphicsElement>('[data-tp-wall]');
  const pick = <T extends SVGGraphicsElement>(selector: string) => asset.querySelector<T>(selector);

  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 });
  const packets = CORRIDOR.rows.map((_, i) => pick(`[data-tp-packet="${i}"]`));
  const landed = CORRIDOR.rows.map((_, i) => pick(`[data-tp-landed="${i}"]`));

  timeline
    .set(packets.filter(Boolean), { opacity: 0 })
    .set(landed.filter(Boolean), { opacity: 0 })
    .call(() => ui.setReadout('boundary idle', 'chain holds nothing yet'));

  let crossed = 0;
  let held = 0;

  CORRIDOR.rows.forEach((row, index) => {
    const packet = packets[index];
    const target = landed[index];
    const at = index * TIMING.stagger;

    timeline
      .fromTo(
        packet,
        { attr: { x: CORRIDOR.packetStartX }, opacity: 0 },
        { opacity: 1, duration: 0.14, ease: 'none' },
        at,
      )
      .to(
        packet,
        {
          attr: { x: row.crosses ? CORRIDOR.packetCrossX : CORRIDOR.packetHeldX },
          duration: TIMING.travel,
          // A field that crosses glides through; a field that is held arrives
          // hard against the wall and stops. The easing is the whole argument.
          ease: row.crosses ? 'power1.inOut' : 'power3.in',
        },
        at + 0.14,
      )
      .to(packet, { opacity: 0, duration: TIMING.land, ease: 'power2.out' }, '>-0.06')
      .to(target, { opacity: 1, duration: TIMING.land, ease: 'power2.out' }, '<')
      .call(
        () => {
          if (row.crosses) crossed += 1;
          else held += 1;
          ui.setReadout(
            row.crosses ? `${row.key} written` : `${row.key} held`,
            `${crossed} on chain · ${held} never sent`,
          );
        },
        undefined,
        '<',
      );

    // The wall visibly takes the hit for every field it refuses.
    if (!row.crosses && wall) {
      timeline
        .to(wall, { opacity: 1, duration: 0.1, ease: 'power2.out' }, '<')
        .to(wall, { opacity: 0.45, duration: 0.34, ease: 'power2.out' });
    }
  });

  timeline
    .to({}, { duration: TIMING.hold })
    .call(() => ui.setReadout('settled', '4 fields public · 4 fields never sent'))
    .to({}, { duration: TIMING.hold })
    .to(landed.filter(Boolean), { opacity: 0, duration: TIMING.clear, ease: 'power2.in' })
    .call(() => {
      crossed = 0;
      held = 0;
    });

  return connectLoop(asset, timeline, ui, 'boundary idle', 'illustrative fields');
};
