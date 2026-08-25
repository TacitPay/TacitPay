import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@/components/Logo';

// Chrome for the public marketing surface at `/`. Deliberately not AppShell:
// the app chrome carries wallet, network and proving state, none of which
// belongs on a page you can read without connecting anything.

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#privacy', label: 'What stays private' },
  { href: '#proof', label: 'Verify' },
];

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-zinc-50/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" aria-label="TacitPay home" className="-m-1 rounded-md p-1">
            <Logo size={30} badge="" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-950"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Link
            to="/app"
            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800"
          >
            Launch app
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs space-y-3">
              <Logo size={28} badge="" />
              <p className="text-sm leading-6 text-zinc-500">
                Private invoicing and settlement on Midnight. Private by default, provable on
                demand.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-14 gap-y-6 font-mono text-xs tracking-wider text-zinc-500 uppercase">
              <div className="space-y-2.5">
                <p className="text-zinc-950">Product</p>
                <Link to="/app" className="block transition-colors hover:text-zinc-950">
                  Launch app
                </Link>
                <Link to="/app#verify" className="block transition-colors hover:text-zinc-950">
                  Verify an invoice
                </Link>
              </div>
              <div className="space-y-2.5">
                <p className="text-zinc-950">Built on</p>
                <a
                  href="https://midnight.network"
                  target="_blank"
                  rel="noreferrer"
                  className="block transition-colors hover:text-zinc-950"
                >
                  Midnight
                </a>
                <a
                  href="https://docs.midnight.network"
                  target="_blank"
                  rel="noreferrer"
                  className="block transition-colors hover:text-zinc-950"
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
