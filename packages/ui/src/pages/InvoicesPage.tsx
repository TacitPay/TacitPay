import { Add, ArrowRight2, ReceiptText } from 'iconsax-reactjs';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { CopyButton } from '@/components/CopyButton';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { ProofStepper } from '@/components/ProofStepper';
import { ProvingUnavailableNotice } from '@/components/ProvingUnavailableNotice';
import { StatusBadge } from '@/components/StatusBadge';
import { TransactionSuccess } from '@/components/TransactionSuccess';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { type InvoiceView, useTacitPay } from '@/lib/api';
import { endpointsFor } from '@/lib/api/deployment';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime, parseAmount, toUnixSeconds } from '@/lib/format';
import { useProving } from '@/lib/proving-context';

// The merchant's half of the lifecycle: issue an invoice, watch it settle,
// open one to act on it. This index deliberately carries no row actions any
// more — withdraw, cancel and the copy buttons moved to the detail route,
// where the whole record is in view. A row here is a door, not a workbench.

interface CreatedInvoice {
  invoiceId: string;
  link: string;
  txId: string;
}

function NewInvoiceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  onCreated(): void;
}) {
  const { api, network, proofStage } = useTacitPay();
  const tokenSymbol = endpointsFor(network).tokenSymbol;
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedInvoice | null>(null);

  function reset() {
    setAmount('');
    setMemo('');
    setExpiry('');
    setError(null);
    setCreated(null);
  }

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen && submitting) return;
    onOpenChange(nextOpen);
    if (!nextOpen && !submitting) reset();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.createInvoice({
        amount: parseAmount(amount),
        memo: memo.trim(),
        expiresAt: toUnixSeconds(expiry),
      });
      setCreated(result);
      onCreated();
    } catch (creationError) {
      setError(getErrorMessage(creationError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{created ? 'Invoice ready' : 'New invoice'}</DialogTitle>
          <DialogDescription>
            {created
              ? 'Share this private link directly with your payer.'
              : 'Amounts use 6 decimal places. The memo stays off the public ledger.'}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <TransactionSuccess
              txId={created.txId}
              title="Invoice created"
              description="The public commitment is confirmed and the private payment link is ready."
            />
            <div className="space-y-2">
              <Label htmlFor="created-link">Private invoice link</Label>
              <div
                id="created-link"
                className="max-h-28 overflow-y-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-5 break-all"
              >
                {created.link}
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={created.link} label="Copy invoice link" />
                <CopyButton value={created.invoiceId} label="Copy invoice ID" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => changeOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-amount">Amount in {tokenSymbol}</Label>
              <Input
                id="invoice-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="1.250000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={error ? true : undefined}
              />
              <p className="text-xs text-muted-foreground">Up to 6 decimal places.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-memo">Memo</Label>
              <Input
                id="invoice-memo"
                type="text"
                autoComplete="off"
                placeholder="Logo design — final"
                maxLength={280}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                aria-invalid={error ? true : undefined}
              />
              <p className="text-xs text-muted-foreground">
                Known only to you and the link recipient.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-expiry">Expiry (optional)</Label>
              <Input
                id="invoice-expiry"
                type="datetime-local"
                autoComplete="off"
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
                aria-invalid={error ? true : undefined}
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/25 bg-destructive/5 p-3"
              >
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : null}
            {submitting && proofStage ? <ProofStepper stage={proofStage} /> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => changeOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !amount.trim() || !memo.trim()}
                aria-busy={submitting}
              >
                {submitting ? 'Creating invoice…' : 'Create invoice'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvoicesList({
  dialogOpen,
  onDialogOpenChange,
}: {
  dialogOpen: boolean;
  onDialogOpenChange(open: boolean): void;
}) {
  const { api } = useTacitPay();
  const { resolution, resolving } = useProving();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoadError(null);
    try {
      setInvoices(await api.listMyInvoices());
    } catch (error) {
      setLoadError(getErrorMessage(error));
      setInvoices(null);
    }
  }, [api]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  return (
    <>
      <NewInvoiceDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        onCreated={() => void loadInvoices()}
      />

      <div className="space-y-5">
        {/* Creation proves too, so the notice belongs on the index even with
            the row actions gone. */}
        {!resolving && !resolution?.effectiveTier ? (
          <ProvingUnavailableNotice reason={resolution?.reason} />
        ) : null}

        {loadError ? (
          <ErrorState message={loadError} onRetry={() => void loadInvoices()} />
        ) : invoices === null ? (
          <TableSkeleton />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={24} variant="Linear" aria-hidden="true" />}
            title="No invoices yet"
            description="Create your first private invoice. Its amount and memo stay off the public ledger."
            action={
              <Button type="button" onClick={() => onDialogOpenChange(true)}>
                <Add size={17} variant="Linear" aria-hidden="true" />
                Create invoice
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table className="min-w-[840px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Memo</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="sr-only">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.invoiceId}
                    // The row is the link: every cell leads to the same
                    // detail, and the actions that used to crowd this table
                    // now live where they have room.
                    className="cursor-pointer"
                    onClick={() => navigate(`/invoices/${invoice.invoiceId}`)}
                  >
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell>
                      <PrivateAmount amount={invoice.amount} token={invoice.token} />
                    </TableCell>
                    <TableCell className="max-w-64 whitespace-normal">
                      <p className="font-medium">{invoice.memo}</p>
                      <code className="font-mono text-xs text-muted-foreground">
                        {invoice.invoiceId.slice(0, 10)}…
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(invoice.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(invoice.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Link
                          to={`/invoices/${invoice.invoiceId}`}
                          aria-label={`Open invoice ${invoice.memo}`}
                          onClick={(event) => event.stopPropagation()}
                          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <ArrowRight2 size={16} variant="Linear" aria-hidden="true" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}

export function InvoicesPage() {
  const { connection } = useProving();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      {/* The header stands outside the gate: a visitor without a wallet still
          learns what this section is. The action only appears once a wallet
          is here to act with — a dead button is worse than none. */}
      <PageHeader
        eyebrow="Invoice"
        title="Your invoices"
        description="Create private payment requests and follow their public settlement status."
        action={
          connection ? (
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Add size={18} variant="Linear" aria-hidden="true" />
              New invoice
            </Button>
          ) : undefined
        }
      />
      <SandboxBanner />
      <WalletGate
        title="Connect a merchant wallet"
        description="Your wallet unlocks the invoice records kept in private state."
      >
        {() => <InvoicesList dialogOpen={dialogOpen} onDialogOpenChange={setDialogOpen} />}
      </WalletGate>
    </>
  );
}
