import { Reveal, MicroLabel } from '../shared';

// Numbers, and only numbers that are true today. `yarn test` is the source for
// the first one — update it here when the suite grows, or it becomes a claim
// rather than a fact.

const FACTS = [
  { value: '86', label: 'tests passing' },
  { value: '4', label: 'circuits, zero disclosures' },
  { value: '0', label: 'servers in the payment path' },
  { value: 'Apache-2.0', label: 'read every line' },
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
