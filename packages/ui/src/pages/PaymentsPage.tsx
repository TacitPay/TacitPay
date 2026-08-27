import { Link21, ReceiptText, Verify } from 'iconsax-reactjs';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, TableSkeleton } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WalletGate } from '@/components/WalletGate';
import { type InvoiceStatus, type ReceiptView, useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
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
    // behaves.
    <Card className="max-w-xl">
      <CardHeader>
        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Link21 size={20} variant="Linear" aria-hidden="true" />
        </div>
        <CardTitle>Pay an invoice</CardTitle>
        <CardDescription>
          Paste the private link you received. Its payload stays after the # and never reaches a
          server.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={open} className="space-y-3" noValidate>
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
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'invoice-link-error' : undefined}
            />
            {error ? (
              <p id="invoice-link-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={!invoiceLink.trim()}>
            Open invoice
          </Button>
        </form>
      </CardContent>
    </Card>
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
  return (
    <>
      <PageHeader
        title="Your payments"
        description="Open an invoice link to pay it, and keep the receipts of everything you have settled."
      />
      <SandboxBanner />
      <div className="space-y-8">
        <OpenInvoiceCard />
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Receipts</h2>
          <WalletGate
            title="Connect a payer wallet"
            description="Connect the wallet that paid your invoices to unlock its private receipts."
          >
            {() => <ReceiptsList />}
          </WalletGate>
        </section>
      </div>
    </>
  );
}
