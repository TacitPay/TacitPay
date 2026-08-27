import {
  Book1,
  ExportSquare,
  Global,
  MoneySend,
  ReceiptText,
  Setting2,
  ShieldTick,
  Verify,
} from 'iconsax-reactjs';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { SiteLink } from '@/components/marketing/AppLink';
import { useTacitPay } from '@/lib/api';
import { getProvingDisplayLabel } from '@/lib/proving';
import { useProving } from '@/lib/proving-context';
import { cn } from '@/lib/utils';

import { GithubMark } from './GithubMark';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { WalletButton } from './WalletButton';

// The nav is the invoice's own lifecycle — issue it, pay it, prove it — with
// Settings holding the machine room. Each stage wears its own page's mark:
// Invoices the document, Payments the money leaving, Verification the same
// shield-tick the verify pages already use.
const navigation = [
  { label: 'Invoices', to: '/invoices', icon: ReceiptText },
  { label: 'Payments', to: '/payments', icon: MoneySend },
  { label: 'Verification', to: '/verification', icon: Verify },
  { label: 'Settings', to: '/settings', icon: Setting2 },
];

// The landing's own measure, carried into the app so the two surfaces line up:
// the mark sits at the same inset on both, and the page under it keeps the same
// left edge as the mark. One constant rather than three copies, because these
// three have to agree or the chrome stops framing the content.
const MEASURE = 'mx-auto w-full max-w-[92rem] px-5 sm:px-8';

// The round icon buttons in the header and footer are the landing's, verbatim —
// the docs door and the theme toggle are a matched pair on both surfaces.
const ICON_BUTTON =
  'grid place-items-center rounded-full border border-tp-rule-strong text-tp-ink-faint transition-colors hover:border-tp-ink-faint hover:text-tp-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

// Where the app can send you. In-app routes stay SPA-routed, `site` hops back
// to the marketing apex (see SiteLink), and the rest live on other hosts.
type FooterLink =
  { label: string; to: string } | { label: string; site: string } | { label: string; href: string };

const FOOTER_SECTIONS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'App',
    links: [
      { label: 'Invoices', to: '/invoices' },
      { label: 'Payments', to: '/payments' },
      { label: 'Verification', to: '/verification' },
      { label: 'Settings', to: '/settings' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Docs', href: 'https://docs.tacitpay.xyz' },
      { label: 'Whitepaper', href: 'https://docs.tacitpay.xyz/whitepaper/' },
      { label: 'FAQ', href: 'https://docs.tacitpay.xyz/reference/faq/' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'Website', site: '/' },
      { label: 'Source', href: 'https://github.com/TacitPay/TacitPay' },
      { label: 'Midnight', href: 'https://midnight.network' },
    ],
  },
];

// The phone keeps its words: a tooltip needs a pointer to hover, and a row of
// four unlabelled glyphs is a guessing game on a touch screen.
function navigationClass(isActive: boolean) {
  return cn(
    'inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
  );
}

// The desktop bar goes to glyphs alone. Square and borderless, so the four
// routes stay one group and do not turn into four more circles beside the
// round controls; the active route keeps the same filled treatment it had as
// a word. Every one carries its name for the pointer and the screen reader.
function navigationIconClass(isActive: boolean) {
  return cn(
    'grid size-9 place-items-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
    isActive
      ? 'bg-accent text-accent-foreground'
      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
  );
}

function FooterLink({ link }: { link: FooterLink }) {
  const className = 'block transition-colors hover:text-foreground';
  if ('to' in link) {
    return (
      <Link to={link.to} className={className}>
        {link.label}
      </Link>
    );
  }
  if ('site' in link) {
    return (
      <SiteLink to={link.site} className={className}>
        {link.label}
      </SiteLink>
    );
  }
  return (
    <a href={link.href} target="_blank" rel="noreferrer" className={className}>
      {link.label}
    </a>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { network } = useTacitPay();
  const { resolution, resolving } = useProving();
  const networkLabel = network === 'preview' ? 'Preview' : 'Local';
  const provingAvailable = Boolean(resolution?.effectiveTier);
  const provingLabel = resolving ? 'Checking…' : getProvingDisplayLabel(resolution);

  return (
    // `isolate` is load-bearing: it gives the shell its own stacking context so
    // the ground below can sit at a negative z INSIDE it. Without it the layer
    // would fall behind the body's own background and never be seen.
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      {/* THE GROUND — the landing's measuring field, carried through so the two
          surfaces read as one product: paper is ruled into a grid, the void is
          a field of dots. Fixed rather than scrolled, because a work surface
          should hold still under the work, and faded out down the viewport so
          the footer keeps a clean ground to sit on. */}
      <div
        aria-hidden="true"
        className="tp-field pointer-events-none fixed inset-0 -z-10 [-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_45%,transparent_95%)] [mask-image:linear-gradient(to_bottom,#000_0%,#000_45%,transparent_95%)]"
      />

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className={cn(MEASURE, 'flex h-16 items-center justify-between')}>
          <div className="flex min-w-0 items-center gap-3">
            {/* In-app the mark returns to the app's own home, not the marketing
                page — leaving mid-task should take a deliberate click. Same
                size and same inset as the landing's, so the identity does not
                shift when you cross between them. */}
            <Link
              to="/app"
              aria-label="TacitPay app home"
              className="-m-1 rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Logo size={34} />
            </Link>
            {/* Network and proving are two different settings, so they get the same
                shape and both carry their own label. An unlabelled "Preview" beside
                the wordmark reads as part of the logo. */}
            <Link
              to="/settings"
              aria-label={`Network: ${networkLabel}`}
              className="inline-flex min-h-10 min-w-0 items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Global size={14} variant="Linear" aria-hidden="true" />
              <span className="hidden sm:inline">Network:</span>
              <span className="max-w-32 truncate">{networkLabel}</span>
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
          {/* Routes first, then the round controls, then the wallet — the gap
              between the groups is wider than the gap inside either, so the
              nav does not read as more buttons. The wallet sits last because
              it is the only control here that changes what the app can DO. */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <nav aria-label="Primary navigation" className="mr-1 hidden items-center gap-1 md:flex">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-label={item.label}
                  title={item.label}
                  className={({ isActive }) => navigationIconClass(isActive)}
                >
                  <item.icon size={18} variant="Linear" aria-hidden="true" />
                </NavLink>
              ))}
            </nav>
            {/* Stands down below `sm`: the phone header already carries a logo,
                two state pills and the toggle, and a second round button there
                pushes the wordmark into them. Docs keeps its place in the
                footer, which is where a phone goes looking anyway. */}
            <a
              href="https://docs.tacitpay.xyz"
              aria-label="Documentation"
              title="Docs"
              className={cn(ICON_BUTTON, 'size-9 max-sm:hidden')}
            >
              <Book1 size={15} variant="Linear" aria-hidden="true" />
            </a>
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
        <nav
          aria-label="Mobile navigation"
          className={cn(MEASURE, 'flex gap-1 overflow-x-auto pb-2 md:hidden')}
        >
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => navigationClass(isActive)}
            >
              <item.icon size={16} variant="Linear" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Roomier than it was at both ends, and deliberately asymmetric: the
          bottom carries more than the top, because the work should finish and
          be let go of well before the footer rule arrives. A symmetric gap read
          as the page running straight from the header into the links. */}
      <main id="main-content" className={cn(MEASURE, 'flex-1 pt-14 pb-24 md:pt-20 md:pb-36')}>
        {children}
      </main>

      {/* The app's own doors, in the landing's grammar: three short columns of
          words, then a rule, then the legal line against the icon cluster. */}
      {/* Opaque, like the landing's: the ground stops at the footer rule rather
          than drifting on behind the links. A block's own background paints
          after the negative-z layer below, so this alone covers the field. */}
      <footer className="border-t bg-background">
        <div className={cn(MEASURE, 'py-12')}>
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs space-y-3">
              <SiteLink
                to="/"
                aria-label="TacitPay website"
                className="-m-1 inline-block rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Logo size={28} />
              </SiteLink>
              <p className="text-sm leading-6 text-muted-foreground">
                Private by default. Provable on demand.
              </p>
              <p className="text-xs text-muted-foreground">Wave 1 demo · {networkLabel} network</p>
            </div>

            <div className="flex flex-wrap gap-x-14 gap-y-6 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {FOOTER_SECTIONS.map((section) => (
                <div key={section.title} className="space-y-2.5">
                  <p className="text-foreground">{section.title}</p>
                  {section.links.map((link) => (
                    <FooterLink key={link.label} link={link} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
            <p className="text-xs text-muted-foreground">© 2026 TacitPay · Apache-2.0</p>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/TacitPay/TacitPay"
                target="_blank"
                rel="noreferrer"
                aria-label="TacitPay on GitHub"
                title="GitHub"
                className={cn(ICON_BUTTON, 'size-8')}
              >
                <GithubMark />
              </a>
              <a
                href="https://docs.tacitpay.xyz"
                aria-label="Documentation"
                title="Docs"
                className={cn(ICON_BUTTON, 'size-8')}
              >
                <Book1 size={14} variant="Linear" aria-hidden="true" />
              </a>
              <SiteLink
                to="/"
                aria-label="TacitPay website"
                title="Website"
                className={cn(ICON_BUTTON, 'size-8')}
              >
                <ExportSquare size={14} variant="Linear" aria-hidden="true" />
              </SiteLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
