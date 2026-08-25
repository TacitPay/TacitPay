import { ShieldTick } from 'iconsax-reactjs';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { useTacitPay } from '@/lib/api';
import { getProvingDisplayLabel } from '@/lib/proving';
import { useProving } from '@/lib/proving-context';
import { cn } from '@/lib/utils';

import { Logo } from './Logo';

const navigation = [
  { label: 'Merchant', to: '/merchant' },
  { label: 'Receipts', to: '/receipts' },
  { label: 'Verify', to: '/app#verify-invoice' },
  { label: 'Settings', to: '/settings' },
];

function navigationClass(isActive: boolean) {
  return cn(
    'inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { network } = useTacitPay();
  const { resolution, resolving } = useProving();
  const networkLabel = network === 'preview' ? 'Preview' : 'Local';
  const provingAvailable = Boolean(resolution?.effectiveTier);
  const provingLabel = resolving ? 'Checking…' : getProvingDisplayLabel(resolution);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* In-app the mark returns to the app's own home, not the marketing
                page — leaving mid-task should take a deliberate click. */}
            <Link
              to="/app"
              aria-label="TacitPay app home"
              className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Logo size={34} badge={networkLabel} />
            </Link>
            <Link
              to="/settings"
              aria-label={`Proving: ${provingLabel}`}
              title={resolution?.reason}
              className="inline-flex min-h-10 min-w-0 items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ShieldTick size={14} variant="Linear" aria-hidden="true" />
              <span className="hidden sm:inline">Proving:</span>
              <span className="max-w-32 truncate">{provingLabel}</span>
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  resolving
                    ? 'bg-muted-foreground motion-safe:animate-pulse'
                    : provingAvailable
                      ? 'bg-[var(--status-paid-fg)]'
                      : 'bg-destructive',
                )}
                aria-hidden="true"
              />
            </Link>
          </div>
          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => navigationClass(isActive && !item.to.includes('#'))}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <nav
          aria-label="Mobile navigation"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 md:hidden"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => navigationClass(isActive && !item.to.includes('#'))}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 md:px-6 md:py-14 lg:px-8"
      >
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8">
          <p>Private by default. Provable on demand.</p>
          <p>Wave 1 demo · {networkLabel} network</p>
        </div>
      </footer>
    </div>
  );
}
