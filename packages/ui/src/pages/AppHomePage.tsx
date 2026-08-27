import { ArrowRight, Link21, Verify, WalletMoney } from 'iconsax-reactjs';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ErrorState, TableSkeleton } from '@/components/DataStates';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { type InvoiceView, type ReceiptView, useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { useProving } from '@/lib/proving-context';

// The app's front door — one route, two honest states. A visitor without a
// wallet gets the chooser: three doors and no pretence of data we cannot
// have. A connected wallet gets the dashboard: where the money actually
// stands. The gate between them is the connection itself, never a wall — the
// whitepaper's "no wallet, no account, no permission" would be disproved by
// this page asking for one at the threshold.

function EntryCard({
  icon,
  title,
  description,
  door,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  door: ReactNode;
  children?: ReactNode;
}) {
  return (
    // Every card ends on the same floor: the door is pinned to the bottom, so
    // the three primary buttons share one baseline no matter how much the
    // card above them carries.
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {children}
        <div className="mt-auto">{door}</div>
      </CardContent>
    </Card>
  );
}

function NetworkEyebrow() {
  const { network } = useTacitPay();
  return (
    <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
      {network === 'preview' ? 'Preview network' : 'Local devnet'}
    </p>
  );
}

function HomeChooser() {
  const { api } = useTacitPay();
  const navigate = useNavigate();
  const [invoiceLink, setInvoiceLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  function openInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = invoiceLink.trim();
    try {
      api.decodeLink(value);
      const hashIndex = value.indexOf('#');
      const fragment = hashIndex >= 0 ? value.slice(hashIndex + 1) : value;
      setLinkError(null);
      navigate(`/pay#${fragment}`);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'This invoice link is not valid.');
    }
  }

  return (
    <div className="space-y-10">
      <section className="max-w-2xl space-y-3 pt-2">
        <NetworkEyebrow />
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          What would you like to do?
        </h1>
        <p className="text-muted-foreground">
          Choose the path that matches your role. Nothing here is published until you approve a
          transaction in your wallet.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <EntryCard
          icon={<WalletMoney size={22} variant="Linear" aria-hidden="true" />}
          title="I'm a merchant"
          description="Create private invoices, track settlement, and withdraw paid funds."
          door={<DoorButton to="/invoices">Open your invoices</DoorButton>}
        />

        <EntryCard
          icon={<Link21 size={22} variant="Linear" aria-hidden="true" />}
          title="I have payments"
          description="Paste the private payment link you received. Its payload stays after # and never reaches a server."
          door={<DoorButton to="/payments">Open your payments</DoorButton>}
        >
          {/* The paste path in the verification bar's own miniature: input
              and submit as one quiet instrument, so it cannot fight the
              primary door on the card's floor. */}
          <form onSubmit={openInvoice} noValidate>
            <label htmlFor="invoice-link" className="sr-only">
              Invoice link
            </label>
            <div className="flex items-center gap-1.5 rounded-lg border bg-background p-1 focus-within:ring-2 focus-within:ring-ring">
              <Input
                id="invoice-link"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://tacitpay.example/pay#…"
                value={invoiceLink}
                onChange={(event) => setInvoiceLink(event.target.value)}
                aria-invalid={linkError ? true : undefined}
                aria-describedby={linkError ? 'invoice-link-error' : undefined}
                className="h-9 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              {/* Secondary's own hover only nudges the grey, which reads as
                  dead on a card. Hovering flips the chip to primary instead —
                  an unmistakable "this clicks", and a preview of the door it
                  opens. */}
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                className="h-9 shrink-0 transition-colors hover:bg-primary hover:text-primary-foreground"
                disabled={!invoiceLink.trim()}
              >
                Open
              </Button>
            </div>
            {linkError ? (
              <p id="invoice-link-error" role="alert" className="mt-2 text-sm text-destructive">
                {linkError}
              </p>
            ) : null}
          </form>
        </EntryCard>

        <EntryCard
          icon={<Verify size={22} variant="Linear" aria-hidden="true" />}
          title="Verify an invoice"
          description="Check a public invoice status without connecting a wallet or revealing private details."
          door={<DoorButton to="/verification">Open verification</DoorButton>}
        />
      </section>
    </div>
  );
}

// One door, one shape, everywhere a card offers a way out — the chooser's
// cards and the dashboard's strips speak the same sentence.
function DoorButton({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button asChild className="w-full justify-between">
      <Link to={to}>
        {children}
        <ArrowRight size={17} variant="Linear" aria-hidden="true" />
      </Link>
    </Button>
  );
}

// The strip ends on its own door, pinned to the card's floor exactly like the
// chooser's cards — the dashboard replaces the chooser once a wallet
// connects, so the ways out of it must not change shape.
function DashboardStrip({
  title,
  door,
  children,
}: {
  title: string;
  door: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="space-y-1.5">{children}</div>
        <div className="mt-auto pt-4">{door}</div>
      </CardContent>
    </Card>
  );
}

function StripRow({
  to,
  primary,
  secondary,
}: {
  to: string;
  primary: ReactNode;
  secondary: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="min-w-0 truncate font-medium">{primary}</span>
      <span className="shrink-0 text-muted-foreground">{secondary}</span>
    </Link>
  );
}

function HomeDashboard() {
  const { api } = useTacitPay();
  const [invoices, setInvoices] = useState<InvoiceView[] | null>(null);
  const [receipts, setReceipts] = useState<ReceiptView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoaded(false);
    // Both halves in one settle: a merchant-side failure must not blank the
    // payer's column, nor the other way round.
    const [mine, paid] = await Promise.allSettled([api.listMyInvoices(), api.listMyReceipts()]);
    setInvoices(mine.status === 'fulfilled' ? mine.value : null);
    setReceipts(paid.status === 'fulfilled' ? paid.value : null);
    if (mine.status === 'rejected' && paid.status === 'rejected') {
      setError(getErrorMessage(mine.reason));
    }
    setLoaded(true);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = invoices?.filter((invoice) => invoice.status === 'OPEN') ?? [];
  const paidInvoices = invoices?.filter((invoice) => invoice.status === 'PAID') ?? [];
  const recent = receipts ? [...receipts].sort((a, b) => b.paidAt - a.paidAt) : [];

  return (
    <div className="space-y-8">
      <section className="max-w-2xl space-y-3 pt-2">
        <NetworkEyebrow />
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Where things stand</h1>
        <p className="text-muted-foreground">
          The private view across your invoices and payments. Only this wallet sees these numbers.
        </p>
      </section>

      <SandboxBanner />

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !loaded ? (
        <TableSkeleton />
      ) : (
        <section className="grid gap-5 lg:grid-cols-3">
          <DashboardStrip
            title="Awaiting payment"
            door={<DoorButton to="/invoices">Open your invoices</DoorButton>}
          >
            {invoices === null ? (
              <p className="text-sm text-muted-foreground">Could not read invoice state.</p>
            ) : open.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open invoices.</p>
            ) : (
              open
                .slice(0, 3)
                .map((invoice) => (
                  <StripRow
                    key={invoice.invoiceId}
                    to={`/invoices/${invoice.invoiceId}`}
                    primary={invoice.memo}
                    secondary={<PrivateAmount amount={invoice.amount} token={invoice.token} />}
                  />
                ))
            )}
          </DashboardStrip>
          {/* Withdrawing is the invoice's last act, so this strip doors to
              /invoices like its neighbour — payments own only what you PAID. */}
          <DashboardStrip
            title="Ready to withdraw"
            door={<DoorButton to="/invoices">Open your invoices</DoorButton>}
          >
            {invoices === null ? (
              <p className="text-sm text-muted-foreground">Could not read invoice state.</p>
            ) : paidInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid invoices waiting.</p>
            ) : (
              paidInvoices
                .slice(0, 3)
                .map((invoice) => (
                  <StripRow
                    key={invoice.invoiceId}
                    to={`/invoices/${invoice.invoiceId}`}
                    primary={invoice.memo}
                    secondary={<PrivateAmount amount={invoice.amount} token={invoice.token} />}
                  />
                ))
            )}
          </DashboardStrip>
          <DashboardStrip
            title="Recent payments"
            door={<DoorButton to="/payments">Open your payments</DoorButton>}
          >
            {receipts === null ? (
              <p className="text-sm text-muted-foreground">Could not read payer state.</p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments made from this wallet.</p>
            ) : (
              recent
                .slice(0, 3)
                .map((receipt) => (
                  <StripRow
                    key={`${receipt.invoiceId}-${receipt.txId}`}
                    to={`/verify/${receipt.invoiceId}`}
                    primary={receipt.memo}
                    secondary={formatDateTime(receipt.paidAt)}
                  />
                ))
            )}
          </DashboardStrip>
        </section>
      )}
    </div>
  );
}

export function AppHomePage() {
  const { connection } = useProving();
  return connection ? <HomeDashboard /> : <HomeChooser />;
}
