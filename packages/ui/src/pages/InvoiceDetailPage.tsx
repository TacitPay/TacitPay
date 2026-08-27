import { ArrowLeft2, Danger, DirectboxSend, ReceiptText, Verify } from 'iconsax-reactjs';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CopyButton } from '@/components/CopyButton';
import { DetailSkeleton, EmptyState, ErrorState } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { ProofStepper } from '@/components/ProofStepper';
import { ProvingUnavailableNotice } from '@/components/ProvingUnavailableNotice';
import { StatusBadge } from '@/components/StatusBadge';
import { TransactionSuccess } from '@/components/TransactionSuccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { WalletGate } from '@/components/WalletGate';
import { type InvoiceView, useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime, truncateHash } from '@/lib/format';
import { useProving } from '@/lib/proving-context';

// One invoice, both halves of it: the private record this wallet holds beside
// the public status the chain shows. This page IS the product's argument laid
// flat — everything in the left card never left this machine; everything in
// the right card is what an outsider at /verify/:id can see. The withdraw and
// cancel actions moved here from the index table because settling an invoice
// deserves the whole record in view, not a button squeezed into a row.

type PublicStatus = Awaited<ReturnType<ReturnType<typeof useTacitPay>['api']['getInvoiceStatus']>>;

const INVOICE_ID_PATTERN = /^[0-9a-f]{64}$/iu;

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <p className="shrink-0 text-muted-foreground">{label}</p>
      <div className="min-w-0 text-right font-medium">{children}</div>
    </div>
  );
}

function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const { api, proofStage } = useTacitPay();
  const { resolution, resolving, refreshProving } = useProving();
  // undefined = still loading; null = loaded and genuinely not ours.
  const [invoice, setInvoice] = useState<InvoiceView | null | undefined>(undefined);
  const [publicStatus, setPublicStatus] = useState<PublicStatus | null>(null);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<{ txId: string; title: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setPublicError(null);
    // Two independent halves: the private record from this wallet's state and
    // the public status from the chain. allSettled, so losing one does not
    // blank the other — that asymmetry is the whole point of the page.
    const [mine, chain] = await Promise.allSettled([
      api.listMyInvoices(),
      api.getInvoiceStatus(invoiceId),
    ]);
    if (mine.status === 'fulfilled') {
      setInvoice(mine.value.find((entry) => entry.invoiceId === invoiceId) ?? null);
    } else {
      setInvoice(undefined);
      setLoadError(getErrorMessage(mine.reason));
    }
    if (chain.status === 'fulfilled') setPublicStatus(chain.value);
    else setPublicError(getErrorMessage(chain.reason));
  }, [api, invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: 'withdraw' | 'cancel') {
    setActing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const currentProving = await refreshProving();
      if (!currentProving.effectiveTier) return;
      const result =
        action === 'withdraw' ? await api.withdraw(invoiceId) : await api.cancelInvoice(invoiceId);
      setActionSuccess({
        txId: result.txId,
        title: action === 'withdraw' ? 'Funds withdrawn' : 'Invoice cancelled',
      });
      await load();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setActing(false);
    }
  }

  if (loadError) return <ErrorState message={loadError} onRetry={() => void load()} />;
  if (invoice === undefined) return <DetailSkeleton />;
  if (invoice === null) {
    return (
      <EmptyState
        icon={<ReceiptText size={24} variant="Linear" aria-hidden="true" />}
        title="Not in this wallet's private state"
        description="This wallet holds no record of that invoice ID. If it belongs to someone else, its public status is still anyone's to check."
        action={
          <Button asChild variant="outline">
            <Link to={`/verify/${invoiceId}`}>
              <Verify size={16} variant="Linear" aria-hidden="true" />
              Check the public status
            </Link>
          </Button>
        }
      />
    );
  }

  const actionable = !acting && !resolving && Boolean(resolution?.effectiveTier);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Invoice"
        title={invoice.memo}
        description={`Created ${formatDateTime(invoice.createdAt)} · ID ${truncateHash(invoice.invoiceId)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {invoice.status === 'PAID' ? (
              <Button type="button" disabled={!actionable} onClick={() => void act('withdraw')}>
                <DirectboxSend size={17} variant="Linear" aria-hidden="true" />
                Withdraw
              </Button>
            ) : null}
            {invoice.status === 'OPEN' ? (
              <Button
                type="button"
                variant="outline"
                disabled={!actionable}
                onClick={() => void act('cancel')}
              >
                Cancel invoice
              </Button>
            ) : null}
          </div>
        }
      />
      <SandboxBanner />

      {acting && proofStage ? <ProofStepper stage={proofStage} /> : null}
      {!resolving && !resolution?.effectiveTier ? (
        <ProvingUnavailableNotice reason={resolution?.reason} />
      ) : null}
      {actionError ? (
        <ErrorState message={actionError} title="The invoice action did not complete" />
      ) : null}
      {actionSuccess ? (
        <TransactionSuccess txId={actionSuccess.txId} title={actionSuccess.title} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Private record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Amount">
              <PrivateAmount amount={invoice.amount} token={invoice.token} />
            </DetailRow>
            <DetailRow label="Memo">{invoice.memo}</DetailRow>
            <DetailRow label="Created">{formatDateTime(invoice.createdAt)}</DetailRow>
            <DetailRow label="Expires">{formatDateTime(invoice.expiresAt)}</DetailRow>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Private payment link</p>
              <div className="max-h-24 overflow-y-auto rounded-md border bg-muted/40 p-2.5 font-mono text-xs leading-5 break-all">
                {invoice.link}
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={invoice.link} label="Copy link" />
                <CopyButton value={invoice.invoiceId} label="Copy invoice ID" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {publicError ? (
              <ErrorState
                message={publicError}
                title="Could not read the chain"
                onRetry={() => void load()}
              />
            ) : publicStatus ? (
              <>
                <DetailRow label="Status">
                  <StatusBadge status={publicStatus.status} />
                </DetailRow>
                <DetailRow label="On chain">
                  {publicStatus.exists ? 'Committed' : 'Not found'}
                </DetailRow>
                <DetailRow label="Expires">{formatDateTime(publicStatus.expiresAt)}</DetailRow>
                {publicStatus.paidPool ? (
                  <DetailRow label="Settled via">
                    {publicStatus.paidPool === 'shielded' ? 'Shielded pool' : 'Unshielded pool'}
                  </DetailRow>
                ) : null}
                <Separator />
                <p className="text-sm leading-6 text-muted-foreground">
                  Everything in this card is what an outsider can see — and nothing more. The
                  amount, the memo, and both parties stay in the private record.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/verify/${invoice.invoiceId}`}>
                    <Verify size={16} variant="Linear" aria-hidden="true" />
                    Open public verification
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Reading the chain…</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const normalizedId = invoiceId?.trim().toLowerCase() ?? '';

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground">
        <Link to="/invoices">
          <ArrowLeft2 size={16} variant="Linear" aria-hidden="true" />
          All invoices
        </Link>
      </Button>
      {INVOICE_ID_PATTERN.test(normalizedId) ? (
        <WalletGate
          title="Connect a merchant wallet"
          description="This invoice's private record lives in your wallet's state; connect to open it."
        >
          {() => <InvoiceDetail invoiceId={normalizedId} />}
        </WalletGate>
      ) : (
        <EmptyState
          icon={<Danger size={24} variant="Linear" aria-hidden="true" />}
          title="That is not an invoice ID"
          description="Invoice IDs are 64 hexadecimal characters. Check the link that brought you here."
        />
      )}
    </>
  );
}
