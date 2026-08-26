import { ArrowRight, Book1, ExportSquare } from 'iconsax-reactjs';
import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { AppLink } from '@/components/marketing/AppLink';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { startSmoothScroll } from '@/lib/smoothScroll';

// Chrome for the public marketing surface at `/`. Deliberately not AppShell:
// the app chrome carries wallet, network and proving state, none of which
// belongs on a page you can read without connecting anything.

const NAV = [
  { href: '#record', label: 'The line' },
  { href: '#route', label: 'The route' },
  { href: '#circuits', label: 'The contract' },
  { href: '#built-on', label: 'Built on' },
];

export function MarketingShell({ children }: { children: ReactNode }) {
  // Momentum scroll lives with this shell rather than at the root, so it starts
  // and stops with the marketing surface and never reaches the app routes.
  useEffect(() => startSmoothScroll(), []);

  // The splash follows the theme like every other surface, so the header sits
  // over one ground the whole way down and needs no tone tracking of its own.
  return (
    <div className="min-h-screen bg-tp-surface text-tp-ink">
      <header className="sticky top-0 z-40 border-b border-tp-rule/80 bg-tp-surface/85 backdrop-blur-md">
        {/* Three columns only once there is a nav to centre. Below `lg` the nav
            is `display: none`, which removes it from the grid altogether — and
            grid auto-placement then drops the actions into the MIDDLE column,
            where they overhang the logo by about 20px at 390. A flex row has no
            such trap: logo left, actions right, nothing to centre. */}
        <div className="mx-auto flex h-16 max-w-[92rem] items-center justify-between px-5 sm:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Link
            to="/"
            aria-label="TacitPay home"
            className="-m-1 justify-self-start rounded-md p-1"
          >
            <Logo size={30} />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[0.6875rem] font-medium tracking-[0.14em] text-tp-ink-faint uppercase transition-colors hover:text-tp-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Tighter below `sm` only. At 320 — the width index.css declares as
              the floor — the logo, the toggle and this button are 4px wider
              than the bar, and the button lands on the wordmark. Everything
              from 640 up keeps the roomier spacing. */}
          <div className="flex items-center gap-2 justify-self-end sm:gap-2.5">
            {/* Docs sits as an icon beside the theme toggle, in its exact
                register — the nav keeps only this page's own chapters. */}
            <a
              href="https://docs.tacitpay.xyz"
              aria-label="Documentation"
              title="Docs"
              className="grid size-9 place-items-center rounded-full border border-tp-rule-strong text-tp-ink-faint transition-colors hover:border-tp-ink-faint hover:text-tp-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Book1 size={15} variant="Linear" aria-hidden="true" />
            </a>
            <ThemeToggle />
            <AppLink
              to="/app"
              className="group inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3 text-[0.6875rem] font-semibold tracking-[0.12em] text-primary-foreground uppercase transition-colors hover:bg-primary/85 sm:gap-1.5 sm:px-4"
            >
              Launch app
              <ArrowRight
                size={14}
                variant="Linear"
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </AppLink>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-tp-rule bg-tp-surface">
        <div className="mx-auto max-w-[92rem] px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs space-y-3">
              <Logo size={28} />
              <p className="text-sm leading-6 text-tp-ink-faint">
                Private invoicing and settlement on Midnight. Private by default, provable on
                demand.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-14 gap-y-6 text-xs font-medium tracking-[0.12em] text-tp-ink-faint uppercase">
              <div className="space-y-2.5">
                <p className="text-tp-ink">Product</p>
                <AppLink to="/app" className="block transition-colors hover:text-tp-ink">
                  Launch app
                </AppLink>
                <AppLink to="/app#verify" className="block transition-colors hover:text-tp-ink">
                  Verify an invoice
                </AppLink>
                <a
                  href="https://docs.tacitpay.xyz"
                  className="block transition-colors hover:text-tp-ink"
                >
                  Docs
                </a>
                <a
                  href="https://github.com/TacitPay/TacitPay"
                  target="_blank"
                  rel="noreferrer"
                  className="block transition-colors hover:text-tp-ink"
                >
                  Source
                </a>
              </div>
              <div className="space-y-2.5">
                <p className="text-tp-ink">Built on</p>
                <a
                  href="https://midnight.network"
                  target="_blank"
                  rel="noreferrer"
                  className="block transition-colors hover:text-tp-ink"
                >
                  Midnight
                </a>
                <a
                  href="https://docs.midnight.network"
                  target="_blank"
                  rel="noreferrer"
                  className="block transition-colors hover:text-tp-ink"
                >
                  Compact docs
                </a>
              </div>
            </div>
          </div>

          {/* The legal line keeps the left; the right carries the icon cluster
              for the places TacitPay actually lives. GitHub wears its own mark
              — a brand is not an interface icon. */}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-tp-rule pt-6">
            <p className="text-xs text-tp-ink-faint">© 2026 TacitPay · Apache-2.0</p>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/TacitPay/TacitPay"
                target="_blank"
                rel="noreferrer"
                aria-label="TacitPay on GitHub"
                title="GitHub"
                className="grid size-8 place-items-center rounded-full border border-tp-rule-strong text-tp-ink-faint transition-colors hover:border-tp-ink-faint hover:text-tp-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
              </a>
              <a
                href="https://docs.tacitpay.xyz"
                aria-label="Documentation"
                title="Docs"
                className="grid size-8 place-items-center rounded-full border border-tp-rule-strong text-tp-ink-faint transition-colors hover:border-tp-ink-faint hover:text-tp-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Book1 size={14} variant="Linear" aria-hidden="true" />
              </a>
              <AppLink
                to="/app"
                aria-label="Launch the app"
                title="Launch app"
                className="grid size-8 place-items-center rounded-full border border-tp-rule-strong text-tp-ink-faint transition-colors hover:border-tp-ink-faint hover:text-tp-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ExportSquare size={14} variant="Linear" aria-hidden="true" />
              </AppLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
