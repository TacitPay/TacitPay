import { ArrowRight } from 'iconsax-reactjs';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  // The splash follows the theme like every other surface, so the header sits
  // over one ground the whole way down and needs no tone tracking of its own.
  return (
    <div className="min-h-screen bg-tp-surface text-tp-ink">
      <header className="sticky top-0 z-40 border-b border-tp-rule/80 bg-tp-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[92rem] items-center justify-between px-5 sm:px-8">
          <Link to="/" aria-label="TacitPay home" className="-m-1 rounded-md p-1">
            <Logo size={30} />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="font-mono text-[0.6875rem] tracking-[0.14em] text-tp-ink-faint uppercase transition-colors hover:text-tp-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              to="/app"
              className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 font-mono text-[0.6875rem] font-semibold tracking-[0.12em] text-primary-foreground uppercase transition-colors hover:bg-primary/85"
            >
              Launch app
              <ArrowRight
                size={14}
                variant="Linear"
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
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

            <div className="flex flex-wrap gap-x-14 gap-y-6 font-mono text-xs tracking-wider text-tp-ink-faint uppercase">
              <div className="space-y-2.5">
                <p className="text-tp-ink">Product</p>
                <Link to="/app" className="block transition-colors hover:text-tp-ink">
                  Launch app
                </Link>
                <Link to="/app#verify" className="block transition-colors hover:text-tp-ink">
                  Verify an invoice
                </Link>
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

          <p className="mt-10 border-t border-zinc-200 pt-6 font-mono text-xs text-zinc-400">
            Apache-2.0 · Midnight Buildathon 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
