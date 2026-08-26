import { EclipseMark } from '../../EclipseMark';
import { Reveal, SectionIntro } from '../shared';

// The page's second dark surface, and the only other one. The inversion is the
// argument: this chapter is about absence, so it is set on the ground where the
// mark's shielded ring is all that is left of it.

const CANNOT_SEE = [
  {
    title: 'We run no server',
    body: 'Invoice details travel inside the link fragment, which browsers never send to a server. There is no backend to subpoena, breach, or quietly log.',
  },
  {
    title: 'We run no prover',
    body: 'Generating a proof requires your private data, so TacitPay never operates one. It happens inside your wallet, or on a machine you control.',
  },
  {
    title: 'We hold no keys',
    body: 'Withdrawal is proven from a secret that only ever exists on your device. Nobody at TacitPay can move your funds, because there is nobody to ask.',
  },
];

export function CannotSeeSection() {
  return (
    <section id="cannot-see" className="tp-grain relative overflow-hidden bg-tp-invert-surface">
      <div className="mx-auto max-w-[92rem] px-5 py-20 sm:px-8 md:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-20">
          <div>
            <SectionIntro
              tone="invert"
              eyebrow="Structural, not promised"
              title="What TacitPay cannot see."
              lede="Every payment product says it respects your privacy. The difference here is that there is no version of TacitPay that could look, even if we wanted to."
            />

            <div className="mt-12 space-y-8">
              {CANNOT_SEE.map((item) => (
                <Reveal key={item.title} className="border-l border-tp-invert-rule pl-6">
                  <h3 className="font-display text-2xl tracking-tight text-tp-invert-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-xl leading-7 text-tp-invert-ink-muted">{item.body}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal className="w-full max-w-sm justify-self-center lg:justify-self-end">
            <EclipseMark inverted annotated={false} className="w-full opacity-90" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
