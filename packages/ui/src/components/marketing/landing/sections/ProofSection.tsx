import { Reveal, MicroLabel } from '../shared';

// Structural guarantees, not build evidence. Each one is a thing the product
// cannot do rather than a thing it promises not to — which is the only kind of
// privacy claim worth printing. Test counts and the licence live in the README
// and currentstate.md, where someone auditing the work will look for them.

const FACTS = [
  { value: '0', label: 'servers in the payment path' },
  { value: '0', label: 'keys held on your behalf' },
  { value: '0', label: 'disclosures across four circuits' },
  { value: 'Open', label: 'source, auditable end to end' },
];

export function ProofSection() {
  return (
    <section id="proof" className="border-b border-tp-rule bg-tp-surface">
      <div className="mx-auto max-w-[92rem] px-5 py-16 sm:px-8">
        <Reveal>
          <dl className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((fact) => (
              <div key={fact.label}>
                <dt className="font-display text-4xl tracking-tight tabular-nums">{fact.value}</dt>
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
