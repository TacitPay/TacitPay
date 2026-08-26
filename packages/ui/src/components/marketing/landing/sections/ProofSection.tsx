import { Code, Driver, Eye, Key, type Icon } from 'iconsax-reactjs';

import { MicroLabel, Reveal } from '../shared';

// Structural guarantees, not build evidence. Each one is a thing the product
// cannot do rather than a thing it promises not to — which is the only kind of
// privacy claim worth printing. Test counts and the licence live in the README
// and currentstate.md, where someone auditing the work will look for them.
//
// The icon names the subject and the figure supplies the negation: a key beside
// a zero reads as "no keys" without the row having to say so twice.

interface Fact {
  readonly icon: Icon;
  readonly value: string;
  readonly label: string;
}

const FACTS: readonly Fact[] = [
  { icon: Driver, value: '0', label: 'servers in the payment path' },
  { icon: Key, value: '0', label: 'keys held on your behalf' },
  { icon: Eye, value: '0', label: 'disclosures across four circuits' },
  { icon: Code, value: 'Open', label: 'source, auditable end to end' },
];

export function ProofSection() {
  return (
    <section id="proof" className="border-b border-tp-rule bg-tp-surface">
      <div className="mx-auto max-w-[92rem] px-5 py-16 sm:px-8">
        <Reveal>
          <dl className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((fact) => (
              // A rule over each cell rather than four figures floating in
              // space: the strip is a readout, and a readout has gradations.
              <div key={fact.label} className="border-t border-tp-rule-strong pt-5">
                <fact.icon
                  size={20}
                  variant="Linear"
                  aria-hidden="true"
                  className="text-tp-ink-faint"
                />
                <dt className="mt-4 font-display text-4xl tracking-tight tabular-nums">
                  {fact.value}
                </dt>
                <dd className="mt-2">
                  <MicroLabel className="text-tp-ink-faint">{fact.label}</MicroLabel>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
