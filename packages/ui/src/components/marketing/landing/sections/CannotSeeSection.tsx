import { Cpu, Driver, Key, type Icon } from 'iconsax-reactjs';

import { Reveal, SectionIntro } from '../shared';
import { CannotSeeDial } from './CannotSeeDial';

// This chapter used to be set on the opposite ground — the inversion was meant
// to carry the argument, since it is about absence. In practice it read as a
// bug: a visitor who has chosen light mode does not expect one section to stay
// near-black, and the meaning was not worth the confusion. It now follows the
// theme like every other surface and stays distinct through its layout — a
// two-column split with the mark, and a ruled list — rather than its ground.

// The icon names the component that is missing, and the heading supplies the
// "no" — the same division of labour the proof strip uses.
const CANNOT_SEE: readonly { icon: Icon; title: string; body: string }[] = [
  {
    icon: Driver,
    title: 'We run no server',
    body: 'Details travel inside the link. There is no backend to breach, subpoena, or log.',
  },
  {
    icon: Cpu,
    title: 'We run no prover',
    body: 'Proofs need your private data, so they run in your wallet or on a machine you control.',
  },
  {
    icon: Key,
    title: 'We hold no keys',
    body: 'Withdrawals are proven from a secret that never leaves your device. There is nobody to ask.',
  },
];

export function CannotSeeSection() {
  return (
    <section
      id="cannot-see"
      className="tp-grain relative overflow-hidden border-b border-tp-rule bg-tp-surface-alt"
    >
      <div className="mx-auto max-w-[92rem] px-5 py-20 sm:px-8 md:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-20">
          <div>
            <SectionIntro
              eyebrow="Structural, not promised"
              title="What TacitPay cannot see."
              lede="Not a promise — there is no version of TacitPay that could look."
            />

            <div className="mt-12 space-y-8">
              {CANNOT_SEE.map((item) => (
                <Reveal key={item.title} className="border-l border-tp-rule-strong pl-6">
                  <div className="flex items-center gap-2.5">
                    <item.icon
                      size={19}
                      variant="Linear"
                      aria-hidden="true"
                      className="shrink-0 text-tp-ink-faint"
                    />
                    <h3 className="font-display text-2xl font-semibold tracking-tight text-tp-ink">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-2 max-w-xl leading-7 text-tp-ink-muted">{item.body}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal className="w-full max-w-xl justify-self-center lg:justify-self-end">
            <CannotSeeDial className="w-full" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
