import { ArrowRight } from 'iconsax-reactjs';
import { Link } from 'react-router-dom';

import { Reveal } from '../shared';

export function FinalCta() {
  return (
    <section className="bg-tp-surface-alt">
      <div className="mx-auto max-w-[92rem] px-5 py-24 text-center sm:px-8 md:py-32">
        <Reveal>
          <h2 className="mx-auto max-w-3xl font-display text-4xl leading-[1.08] tracking-tight text-balance sm:text-5xl">
            Issue an invoice that proves itself.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-tp-ink-muted">
            Create one in the browser, send the link, and let anyone confirm it settled — without
            handing them your ledger.
          </p>
          <Link
            to="/app"
            className="group mt-10 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 font-mono text-xs font-semibold tracking-[0.14em] text-primary-foreground uppercase transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Get started
            <ArrowRight
              size={16}
              variant="Linear"
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
