import { ArrowRight, Link21, ReceiptText, Verify, WalletMoney } from 'iconsax-reactjs';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, TableSkeleton } from '@/components/DataStates';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
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
        >
          <Button asChild className="w-full justify-between">
            <Link to="/invoices">
              Open your invoices
              <ArrowRight size={17} variant="Linear" aria-hidden="true" />
            </Link>
          </Button>
        </EntryCard>

        <EntryCard
          icon={<Link21 size={22} variant="Linear" aria-hidden="true" />}
          title="I have an invoice link"
          description="Paste the private payment link you received. Its payload stays after # and never reaches a server."
        >
          <form onSubmit={openInvoice} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-link">Invoice link</Label>
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
                aria-describedby={linkError ? 'invoice-link-error' : 'invoice-link-help'}
              />
              {linkError ? (
                <p id="invoice-link-error" role="alert" className="text-sm text-destructive">
                  {linkError}
                </p>
              ) : (
                <p id="invoice-link-help" className="text-xs text-muted-foreground">
                  The private payload must follow the # fragment.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!invoiceLink.trim()}>
              Open invoice
            </Button>
          </form>
        </EntryCard>

        <EntryCard
          icon={<Verify size={22} variant="Linear" aria-hidden="true" />}
          title="Verify an invoice"
          description="Check a public invoice status without connecting a wallet or revealing private details."
        >
          <Button asChild variant="outline" className="w-full justify-between">
            <Link to="/verification">
              Open verification
              <ArrowRight size={17} variant="Linear" aria-hidden="true" />
            </Link>
          </Button>
        </EntryCard>
      </section>
    </div>
  );
}

function DashboardStrip({
  title,
  to,
  linkLabel,
  children,
}: {
  title: string;
  to: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Link
          to={to}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel} →
        </Link>
      </CardHeader>
      <CardContent className="space-y-1.5">{children}</CardContent>
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
  // "Nothing yet" may only be claimed when BOTH halves genuinely answered
  // empty — a failed half must fall through to the strips, where its own
  // could-not-read message tells the truth about it.
  const nothingYet =
    loaded &&
    !error &&
    invoices !== null &&
    receipts !== null &&
    invoices.length === 0 &&
    receipts.length === 0;

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
      ) : nothingYet ? (
        <EmptyState
          icon={<ReceiptText size={24} variant="Linear" aria-hidden="true" />}
          title="Nothing on the ledger yet"
          description="Create your first private invoice, or open a link someone sent you."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/invoices">Create an invoice</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/payments">Pay an invoice</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <section className="grid gap-5 lg:grid-cols-3">
          <DashboardStrip title="Awaiting payment" to="/invoices" linkLabel="All invoices">
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
          <DashboardStrip title="Ready to withdraw" to="/invoices" linkLabel="All invoices">
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
          <DashboardStrip title="Recent payments" to="/payments" linkLabel="All payments">
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
