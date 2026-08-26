import { Pause, Play } from 'iconsax-reactjs';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { LoopName } from './motion/liveLoop';

/**
 * Marks a block for the scroll reveal. The content is fully present in the DOM
 * either way — the reveal is enhancement, and reduced motion removes it without
 * removing anything to read.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-tp-reveal="true" className={className}>
      {children}
    </div>
  );
}

/** The mono microtype register: eyebrows, scale labels, and instrument chrome. */
export function MicroLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('font-mono text-[0.6875rem] tracking-[0.18em] uppercase', className)}>
      {children}
    </p>
  );
}

/** Eyebrow, editorial statement, and one paragraph of lede. */
export function SectionIntro({
  eyebrow,
  title,
  lede,
  tone = 'surface',
  className,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  /** `invert` is the one chapter set on the opposite ground. */
  tone?: 'surface' | 'invert';
  className?: string;
}) {
  const inverted = tone === 'invert';
  return (
    <Reveal className={className}>
      <MicroLabel className={inverted ? 'text-tp-invert-ink-muted' : 'text-tp-ink-faint'}>
        {eyebrow}
      </MicroLabel>
      <h2
        className={cn(
          'mt-5 font-display text-4xl leading-[1.08] tracking-tight text-balance sm:text-5xl',
          inverted ? 'text-tp-invert-ink' : 'text-tp-ink',
        )}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={cn(
            'mt-6 max-w-2xl text-lg leading-8',
            inverted ? 'text-tp-invert-ink-muted' : 'text-tp-ink-muted',
          )}
        >
          {lede}
        </p>
      ) : null}
    </Reveal>
  );
}

/**
 * The panel every instrument sits in: what it is, that it is illustrative, a
 * real pause control, and a live readout the timeline writes into.
 *
 * The wrapper carries `data-tp-loop` so the timeline can find its own chrome —
 * owning it here rather than in each section means a section cannot forget it.
 * Straight rules by default; only the interlock passes a rounded shell in.
 */
export function LoopPanel({
  loop,
  title,
  note,
  restPhase,
  restValue,
  className,
  chromeClassName,
  children,
}: {
  loop: LoopName;
  title: string;
  note: string;
  restPhase: string;
  restValue: string;
  className?: string;
  chromeClassName?: string;
  children: ReactNode;
}) {
  return (
    <div data-tp-loop={loop} className={className}>
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-y border-tp-rule py-3',
          chromeClassName,
        )}
      >
        <div className="flex shrink-0 items-center gap-3">
          <span aria-hidden="true" className="size-2 bg-tp-ink" />
          <MicroLabel className="text-tp-ink">{title}</MicroLabel>
          <span aria-hidden="true" className="hidden h-px w-10 bg-tp-rule-strong sm:block" />
          <MicroLabel className="hidden text-tp-ink-faint sm:block">{note}</MicroLabel>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-[0.6875rem] tracking-[0.12em] text-tp-ink-faint uppercase">
          <button
            type="button"
            data-tp-loop-toggle
            aria-label={`Pause the ${title.toLowerCase()} animation`}
            className="grid size-8 shrink-0 place-items-center rounded-sm border border-tp-rule-strong text-tp-ink-faint transition-colors hover:border-tp-ink-faint hover:text-tp-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:hidden"
          >
            {/* Wrapped so the timeline can toggle them: `data-*` will not type
                onto an imported icon component. */}
            <span data-tp-loop-pause>
              <Pause size={13} variant="Bold" aria-hidden="true" />
            </span>
            <span data-tp-loop-play className="hidden">
              <Play size={13} variant="Bold" aria-hidden="true" />
            </span>
          </button>
          <span data-tp-loop-phase className="max-w-[11rem] truncate whitespace-nowrap text-tp-ink">
            {restPhase}
          </span>
          <span aria-hidden="true" className="text-tp-rule-strong">
            /
          </span>
          <span data-tp-loop-value className="max-w-[16rem] truncate whitespace-nowrap">
            {restValue}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
