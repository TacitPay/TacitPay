import { ArrowRight } from 'iconsax-reactjs';
import { Link } from 'react-router-dom';

import { EclipseMark } from '@/components/marketing/EclipseMark';
import { MarketingShell } from '@/components/marketing/MarketingShell';

// The public marketing surface. No wallet, no network, no private state —
// everything here is readable by someone who has never heard of Midnight.
// "Get started" is the only door into the app (PRD §9.1).

/** Redaction bar standing in for a value the ledger never receives. */
function Redacted({ width }: { width: string }) {
  return (
    <span
      aria-label="hidden"
      className="inline-block h-3.5 translate-y-px rounded-[2px] bg-zinc-300"
      style={{ width }}
    />
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Create',
    body: 'Your device hashes the amount and memo with a random salt. Only that commitment reaches the chain — never the numbers behind it.',
  },
  {
    n: '02',
    title: 'Share',
    body: 'The invoice link carries its details after the # in the URL. Browsers never send that part to a server, so no server ever sees the invoice.',
  },
  {
    n: '03',
    title: 'Settle',
    body: "The payer's wallet proves the details match the commitment, and a shielded transfer settles it. The status turns PAID for everyone; the numbers stay yours.",
  },
];

const CANNOT_SEE = [
  {
    title: 'We run no server',
    body: 'Invoice details travel inside the link fragment, which never leaves the browser. There is no backend to subpoena, breach, or quietly log.',
  },
  {
    title: 'We run no prover',
    body: 'Generating a proof requires your private data, so TacitPay never operates one. It happens inside your wallet, or on a machine you control.',
  },
  {
    title: 'We hold no keys',
    body: 'Withdrawal is proven from a secret that only ever exists on your device. Nobody at TacitPay can move your funds, because there is no nobody to ask.',
  },
];

const FACTS = [
  { value: '27', label: 'unit tests passing' },
  { value: '4', label: 'circuits, zero disclosures' },
  { value: '0', label: 'servers in the payment path' },
  { value: 'Apache-2.0', label: 'read every line' },
];

export function HomePage() {
  return (
    <MarketingShell>
      {/* ---------------------------------------------------------------- hero */}
      <section className="tp-grain relative overflow-hidden border-b border-zinc-200">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-8">
          <div>
            <p
              className="tp-rise font-mono text-xs tracking-[0.18em] text-zinc-500 uppercase"
              style={{ animationDelay: '40ms' }}
            >
              Private invoicing on Midnight
            </p>

            <h1
              className="tp-rise mt-6 font-display text-5xl leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl"
              style={{ animationDelay: '120ms' }}
            >
              Get paid on-chain without publishing your books.
            </h1>

            <p
              className="tp-rise mt-7 max-w-xl text-lg leading-8 text-zinc-600"
              style={{ animationDelay: '220ms' }}
            >
              On a transparent chain, every payment you receive publishes what you charged and who
              paid it — your revenue and your customer list, permanently. TacitPay settles invoices
              so that anyone can verify they were paid, while the amount, the memo and both parties
              stay private.
            </p>

            <div
              className="tp-rise mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: '320ms' }}
            >
              <Link
                to="/app"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-7 py-3.5 text-base font-medium text-zinc-50 transition-colors hover:bg-zinc-800"
              >
                Get started
                <ArrowRight
                  size={18}
                  variant="Linear"
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <a
                href="#privacy"
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-7 py-3.5 text-base text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-950"
              >
                See what stays private
              </a>
            </div>
          </div>

          <EclipseMark className="w-full max-w-lg justify-self-center lg:justify-self-end" />
        </div>
      </section>

      {/* ------------------------------------------------- what the chain holds */}
      <section id="privacy" className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1fr] lg:gap-16">
            <div>
              <p className="font-mono text-xs tracking-[0.18em] text-zinc-500 uppercase">
                The public record
              </p>
              <h2 className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                Your invoice, exactly as the world can read it.
              </h2>
              <p className="mt-6 text-lg leading-8 text-zinc-600">
                Everything above the line is public by design, so an auditor, a customer or a
                stranger can confirm the invoice settled. Everything below it never reaches the
                chain at all — it is not encrypted on a server somewhere, it is simply never sent.
              </p>
            </div>

            {/* A literal ledger view. Mono, because this is machine truth. */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 font-mono text-sm sm:p-8">
              <dl className="space-y-3.5">
                {[
                  ['invoice_id', '0x8f3a…c21b'],
                  ['status', 'PAID'],
                  ['expires_at', '2026-09-30'],
                  ['commitment', '0x41d9…7e02'],
                ].map(([key, value]) => (
                  <div key={key} className="flex items-baseline justify-between gap-6">
                    <dt className="text-zinc-500">{key}</dt>
                    <dd className="text-zinc-950">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-300" />
                <span className="text-[11px] tracking-[0.16em] text-zinc-400 uppercase">
                  never leaves your device
                </span>
                <div className="h-px flex-1 bg-zinc-300" />
              </div>

              <dl className="space-y-3.5">
                {[
                  ['amount', '96px'],
                  ['memo', '132px'],
                  ['merchant', '88px'],
                  ['payer', '88px'],
                ].map(([key, width]) => (
                  <div key={key} className="flex items-baseline justify-between gap-6">
                    <dt className="text-zinc-500">{key}</dt>
                    <dd>
                      <Redacted width={width} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- how it works */}
      <section id="how" className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
          <p className="font-mono text-xs tracking-[0.18em] text-zinc-500 uppercase">
            How it works
          </p>
          <h2 className="mt-5 max-w-2xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">
            Three steps, and none of them involve trusting us.
          </h2>

          <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-zinc-50 p-8">
                <p className="font-mono text-sm text-zinc-400">{step.n}</p>
                <h3 className="mt-6 font-display text-2xl tracking-tight">{step.title}</h3>
                <p className="mt-3 leading-7 text-zinc-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- inverted: what we can't */}
      <section className="tp-grain relative overflow-hidden bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
          <div className="grid gap-14 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="font-mono text-xs tracking-[0.18em] text-zinc-500 uppercase">
                Structural, not promised
              </p>
              <h2 className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                What TacitPay cannot see.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
                Every payment product says it respects your privacy. The difference here is that
                there is no version of TacitPay that could look, even if we wanted to.
              </p>

              <div className="mt-12 space-y-8">
                {CANNOT_SEE.map((item) => (
                  <div key={item.title} className="border-l border-zinc-800 pl-6">
                    <h3 className="font-display text-2xl tracking-tight">{item.title}</h3>
                    <p className="mt-2 max-w-xl leading-7 text-zinc-400">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <EclipseMark
              inverted
              annotated={false}
              className="w-full max-w-sm justify-self-center opacity-90"
            />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- proof */}
      <section id="proof" className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <dl className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((fact) => (
              <div key={fact.label}>
                <dt className="font-display text-4xl tracking-tight">{fact.value}</dt>
                <dd className="mt-2 font-mono text-xs tracking-[0.14em] text-zinc-500 uppercase">
                  {fact.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ----------------------------------------------------------- final CTA */}
      <section className="bg-zinc-50">
        <div className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 md:py-32">
          <h2 className="mx-auto max-w-3xl font-display text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
            Issue an invoice that proves itself.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-zinc-600">
            Create one in the browser, send the link, and let anyone confirm it settled — without
            handing them your ledger.
          </p>
          <Link
            to="/app"
            className="group mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-8 py-4 text-base font-medium text-zinc-50 transition-colors hover:bg-zinc-800"
          >
            Get started
            <ArrowRight
              size={18}
              variant="Linear"
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
