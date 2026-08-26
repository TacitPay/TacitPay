import { Reveal, SectionIntro } from '../shared';

/**
 * Why this product can exist at all, in one chapter.
 *
 * Not a spec sheet and not a badge wall: the versions this runs on belong in
 * the repository, not on a landing page. What belongs here is the single
 * capability TacitPay is built out of — a chain that holds a public ledger
 * beside a private state and can prove one to the other — and where that
 * capability's security ultimately comes from.
 *
 * The Midnight and Cardano marks are the vendors' own files, unaltered, served
 * from this origin rather than hotlinked: a product whose claim is that no
 * server sees the invoice must not make the visitor's browser announce the
 * visit to two more hosts on the way in. Each ships in two inks, and the page
 * shows whichever suits the ground.
 */

interface Foundation {
  readonly name: string;
  readonly file: string;
  /** Logo heights are normalised by eye, not by box: the two lockups have
   *  different amounts of padding baked into their artboards. */
  readonly heightClass: string;
  readonly role: string;
  readonly detail: string;
  readonly href: string;
}

const FOUNDATIONS: readonly Foundation[] = [
  {
    name: 'Midnight',
    file: 'midnight',
    heightClass: 'h-7',
    role: 'The dual ledger',
    detail:
      'Two states at once — a public ledger anyone can read, and a private state that never leaves your device. Zero-knowledge proofs let the first verify the second without ever receiving it.',
    href: 'https://docs.midnight.network/what-is-midnight',
  },
  {
    name: 'Cardano',
    file: 'cardano',
    heightClass: 'h-[1.6rem]',
    role: 'Inherited security',
    detail:
      'Midnight is its first partner chain, which means it inherits the security of a large, mature network instead of bootstrapping its own — and stays firewalled from it.',
    href: 'https://docs.midnight.network/concepts/sidechains-partnerchains',
  },
];

export function BuiltOnSection() {
  return (
    <section id="built-on" className="border-b border-tp-rule bg-tp-surface">
      <div className="mx-auto max-w-[92rem] px-5 py-20 sm:px-8 md:py-28">
        <SectionIntro
          className="max-w-3xl"
          eyebrow="Built on"
          title="One property makes all of this possible."
          lede="A normal chain forces a choice: publish the amount so the payment can be proven, or keep it private and prove nothing. Midnight refuses the trade — it holds a public ledger beside a private state and proves one to the other. Take that away and TacitPay is just an invoice."
        />

        <div className="mt-16 grid gap-px overflow-hidden border-y border-tp-rule bg-tp-rule md:grid-cols-2">
          {FOUNDATIONS.map((item) => (
            <Reveal key={item.name} className="bg-tp-surface">
              <div className="flex h-full flex-col gap-6 p-8 sm:p-10">
                <div className={`flex ${item.heightClass} items-center`}>
                  {/* Both inks are present; CSS picks the one for this ground. */}
                  <img
                    src={`/brand/${item.file}-on-light.svg`}
                    alt={`${item.name} logo`}
                    className={`tp-mark-on-light w-auto ${item.heightClass}`}
                  />
                  <img
                    src={`/brand/${item.file}-on-dark.svg`}
                    alt=""
                    aria-hidden="true"
                    className={`tp-mark-on-dark w-auto ${item.heightClass}`}
                  />
                </div>

                <div>
                  <h3 className="font-mono text-[0.6875rem] tracking-[0.2em] text-tp-ink uppercase">
                    {item.role}
                  </h3>
                  <p className="mt-3 leading-7 text-tp-ink-muted">{item.detail}</p>
                </div>

                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto font-mono text-[0.6875rem] tracking-[0.12em] text-tp-ink-faint uppercase underline underline-offset-4 transition-colors hover:text-tp-ink"
                >
                  Read the docs ↗
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
