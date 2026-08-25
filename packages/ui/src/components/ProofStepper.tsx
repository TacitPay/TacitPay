import { Clock, TickCircle } from 'iconsax-reactjs';

import { PROOF_STAGES, type ProofStage } from '@/lib/api';
import { cn } from '@/lib/utils';

export function ProofStepper({ stage }: { stage: ProofStage }) {
  const activeIndex = PROOF_STAGES.indexOf(stage);

  return (
    <section
      aria-live="polite"
      aria-label="Transaction proof progress"
      className="rounded-lg border bg-muted/35 p-4"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">Preparing your private transaction</p>
        <span className="text-xs text-muted-foreground">Step {activeIndex + 1} of 5</span>
      </div>
      <ol className="grid gap-3 md:grid-cols-5">
        {PROOF_STAGES.map((proofStage, index) => {
          const complete = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li
              key={proofStage}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md p-2 text-xs leading-5 md:flex-col md:items-start',
                active && 'bg-background font-medium text-foreground',
                !active && !complete && 'text-muted-foreground',
                complete && 'text-primary',
              )}
            >
              {complete ? (
                <TickCircle size={18} variant="Bold" aria-hidden="true" />
              ) : active ? (
                <Clock
                  size={18}
                  variant="Linear"
                  className="motion-safe:animate-pulse"
                  aria-hidden="true"
                />
              ) : (
                <span className="size-[18px] rounded-full border" aria-hidden="true" />
              )}
              <span>{proofStage}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
