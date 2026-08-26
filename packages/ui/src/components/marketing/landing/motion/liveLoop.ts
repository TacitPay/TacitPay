import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Every instrument on the landing page runs a loop, and a loop that runs when
// nobody is looking is just a battery drain. This is the shared contract each
// one signs up to: play only while on screen, stop with the browser tab, offer
// a real pause control, and put the readout back the way it was found on
// teardown (which happens whenever the visitor turns on reduced motion).

export type MotionCleanup = () => void;
export type LoopTimeline = ReturnType<typeof gsap.timeline>;

/** Matches the `data-tp-loop` value on the panel wrapping each instrument. */
export type LoopName = 'invoice-route' | 'disclosure-corridor' | 'circuit-interlock';

export interface LoopUi {
  readonly panel: HTMLElement | null;
  readonly toggle: HTMLButtonElement | null;
  /** Wrappers, not the icons themselves — `data-*` cannot be typed onto an
   *  imported icon component, and `classList` is all this needs. */
  readonly pauseIcon: HTMLElement | null;
  readonly playIcon: HTMLElement | null;
  /** Writes the two-part status line: a phase name and the value it produced. */
  readonly setReadout: (phase: string, value: string) => void;
}

/** Finds the chrome around an instrument. Every part is optional by design —
 *  an asset still animates if its panel has no pause button. */
export const getLoopUi = (asset: SVGSVGElement, loop: LoopName): LoopUi => {
  const panel = asset.closest<HTMLElement>(`[data-tp-loop="${loop}"]`);
  const phase = panel?.querySelector<HTMLElement>('[data-tp-loop-phase]') ?? null;
  const value = panel?.querySelector<HTMLElement>('[data-tp-loop-value]') ?? null;
  const toggle = panel?.querySelector<HTMLButtonElement>('[data-tp-loop-toggle]') ?? null;

  return {
    panel,
    toggle,
    pauseIcon: toggle?.querySelector<HTMLElement>('[data-tp-loop-pause]') ?? null,
    playIcon: toggle?.querySelector<HTMLElement>('[data-tp-loop-play]') ?? null,
    setReadout: (nextPhase, nextValue) => {
      if (phase) phase.textContent = nextPhase;
      if (value) value.textContent = nextValue;
    },
  };
};

/**
 * Wires a timeline to its panel and returns the teardown. The visitor's pause
 * beats the scroll position: once they have asked for stillness, scrolling back
 * into view must not start it moving again.
 */
export const connectLoop = (
  asset: SVGSVGElement,
  timeline: LoopTimeline,
  ui: LoopUi,
  restPhase: string,
  restValue: string,
): MotionCleanup => {
  const pauseLabel = ui.toggle?.getAttribute('aria-label') ?? 'Pause animation';
  const resumeLabel = pauseLabel.startsWith('Pause ')
    ? `Resume ${pauseLabel.slice(6)}`
    : 'Resume animation';

  let started = false;
  let userPaused = false;

  const playWhenVisible = () => {
    if (document.hidden || userPaused) return;
    // `restart` on the first play so the loop always opens on its first frame,
    // never mid-cycle at whatever position a previous teardown left behind.
    if (!started) {
      started = true;
      timeline.restart();
      return;
    }
    timeline.play();
  };

  const visibility = ScrollTrigger.create({
    trigger: ui.panel ?? asset,
    start: 'top 90%',
    end: 'bottom 10%',
    onEnter: playWhenVisible,
    onEnterBack: playWhenVisible,
    onLeave: () => timeline.pause(),
    onLeaveBack: () => timeline.pause(),
  });

  const syncTabVisibility = () => {
    if (document.hidden || !visibility.isActive) timeline.pause();
    else playWhenVisible();
  };

  const syncToggle = () => {
    if (!ui.toggle) return;
    ui.toggle.setAttribute('aria-label', userPaused ? resumeLabel : pauseLabel);
    ui.pauseIcon?.classList.toggle('hidden', userPaused);
    ui.playIcon?.classList.toggle('hidden', !userPaused);
  };

  const handleToggle = () => {
    userPaused = !userPaused;
    syncToggle();
    if (userPaused) timeline.pause();
    else if (visibility.isActive) playWhenVisible();
  };

  syncToggle();
  document.addEventListener('visibilitychange', syncTabVisibility);
  ui.toggle?.addEventListener('click', handleToggle);

  return () => {
    document.removeEventListener('visibilitychange', syncTabVisibility);
    ui.toggle?.removeEventListener('click', handleToggle);
    visibility.kill();
    timeline.kill();
    userPaused = false;
    syncToggle();
    ui.setReadout(restPhase, restValue);
  };
};
