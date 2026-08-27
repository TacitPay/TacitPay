import { ArrowRight, Link21, ReceiptText, Verify } from 'iconsax-reactjs';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, TableSkeleton } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConnectedWalletCard, WalletGate } from '@/components/WalletGate';
import { type InvoiceStatus, type ReceiptView, useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { useProving } from '@/lib/proving-context';
import { cn } from '@/lib/utils';

// The payer's whole side of the lifecycle in one place: open a link to pay,
// and beneath it the receipts of everything already settled. "Where is pay?"
// was the question that forced the re-cut — this page is the answer. The
// /pay#<payload> URL itself is frozen (the CLI emits it, sent links carry it);
// this page is the door that leads there, never a replacement for it.

function OpenInvoiceCard() {
  const { api } = useTacitPay();
  const navigate = useNavigate();
  const [invoiceLink, setInvoiceLink] = useState('');
  const [error, setError] = useState<string | null>(null);

  function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = invoiceLink.trim();
    try {
      api.decodeLink(value);
      const hashIndex = value.indexOf('#');
      const fragment = hashIndex >= 0 ? value.slice(hashIndex + 1) : value;
      setError(null);
      navigate(`/pay#${fragment}`);
    } catch (decodeError) {
      setError(
        decodeError instanceof Error ? decodeError.message : 'This invoice link is not valid.',
      );
    }
  }

  return (
    // Deliberately OUTSIDE the wallet gate: opening a link only decodes what
    // is already in your hands. You see what you are being asked to pay
    // before any wallet enters the room — the opposite order is how phishing
    // behaves. Set in the verification page's explorer register — centred,
    // one wide bar, no card chrome — because both are the same gesture:
    // paste the thing you were handed, and the chain answers.
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-6 text-center md:py-10">
      <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
        Pay an invoice
      </h2>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        Paste the private link you received. Its payload stays after the # and never reaches a
        server.
      </p>

      <form onSubmit={open} className="mt-8 w-full" noValidate>
        <label htmlFor="invoice-link" className="sr-only">
          Invoice link
        </label>
        {/* The explorer bar: the bar owns the border and the focus ring so
            the input and the button read as one instrument. */}
        <div className="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <Link21
            size={20}
            variant="Linear"
            aria-hidden="true"
            className="ml-2.5 shrink-0 text-muted-foreground"
          />
          <Input
            id="invoice-link"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://tacitpay.example/pay#…"
            value={invoiceLink}
            onChange={(event) => setInvoiceLink(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'invoice-link-error' : undefined}
            className="h-12 flex-1 border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            type="submit"
            disabled={!invoiceLink.trim()}
            className="h-12 shrink-0 rounded-xl px-5"
          >
            <span className="hidden sm:inline">Open invoice</span>
            <span className="sm:hidden">Open</span>
            <ArrowRight size={17} variant="Linear" aria-hidden="true" />
          </Button>
        </div>
        {error ? (
          <p id="invoice-link-error" role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

type StatusFilter = 'ALL' | InvoiceStatus;

function ReceiptsList() {
  const { api } = useTacitPay();
  const [receipts, setReceipts] = useState<ReceiptView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  const load = useCallback(async () => {
    setError(null);
    try {
      setReceipts(await api.listMyReceipts());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setReceipts(null);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (receipts === null) return <TableSkeleton />;
  if (receipts.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptText size={24} variant="Linear" aria-hidden="true" />}
        title="No payments yet"
        description="Open an invoice link above to make your first payment. The receipt lands here, in your private payer state."
      />
    );
  }

  // Filters are built from the receipts actually present, so the row of
  // chips never advertises a status the table cannot show.
  const statuses = [...new Set(receipts.map((receipt) => receipt.status))];
  const filtered = filter === 'ALL' ? receipts : receipts.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      {statuses.length > 1 ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {(['ALL', ...statuses] as StatusFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                filter === value
                  ? 'border-transparent bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {value === 'ALL' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Date paid</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Memo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((receipt) => (
              <TableRow key={`${receipt.invoiceId}-${receipt.txId}`}>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(receipt.paidAt)}
                </TableCell>
                <TableCell>
                  <PrivateAmount amount={receipt.amount} token={receipt.token} />
                </TableCell>
                <TableCell className="max-w-60 whitespace-normal font-medium">
                  {receipt.memo}
                </TableCell>
                <TableCell>
                  <StatusBadge status={receipt.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/verify/${receipt.invoiceId}`}>
                        <Verify size={16} variant="Linear" aria-hidden="true" />
                        Verify on chain
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function PaymentsPage() {
  const { connection } = useProving();
  return (
    <>
      <PageHeader
        title="Your payments"
        description="Open an invoice link to pay it, and keep the receipts of everything you have settled."
      />
      <SandboxBanner />
      <div className="space-y-8">
        {/* The connection is page-level status, so it stands above the pay
            card — inside the Receipts section it read as a receipt row. The
            gate below keeps only its connect prompt, seated where the locked
            content actually is. */}
        {connection ? <ConnectedWalletCard connection={connection} /> : null}
        <OpenInvoiceCard />
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Receipts</h2>
          {connection ? (
            <ReceiptsList />
          ) : (
            <WalletGate
              title="Connect a payer wallet"
              description="Connect the wallet that paid your invoices to unlock its private receipts."
            >
              {() => null}
            </WalletGate>
          )}
        </section>
      </div>
    </>
  );
}
