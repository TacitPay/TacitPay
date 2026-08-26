import { Link21, ReceiptText, SearchStatus, Verify } from 'iconsax-reactjs';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { DetailSkeleton, EmptyState, ErrorState } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { ProofStepper } from '@/components/ProofStepper';
import { ProvingUnavailableNotice } from '@/components/ProvingUnavailableNotice';
import { StatusBadge } from '@/components/StatusBadge';
import { TransactionSuccess } from '@/components/TransactionSuccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { WalletGate } from '@/components/WalletGate';
import { type InvoiceLinkPayload, type InvoiceStatus, useTacitPay } from '@/lib/api';
import { useLive } from '@/lib/api/live';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { useProving } from '@/lib/proving-context';

interface PayInvoiceData {
  payload: InvoiceLinkPayload;
  publicState: { status: InvoiceStatus; expiresAt: number; exists: boolean };
}

function PayAction({
  payload,
  onPaid,
}: {
  payload: InvoiceLinkPayload;
  onPaid(txId: string): void;
}) {
  const { api, proofStage } = useTacitPay();
  const { resolution, resolving, refreshProving } = useProving();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const currentProving = await refreshProving();
      if (!currentProving.effectiveTier) return;
      const result = await api.payInvoice(payload);
      onPaid(result.txId);
    } catch (paymentError) {
      setError(getErrorMessage(paymentError));
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-4">
      {paying && proofStage ? <ProofStepper stage={proofStage} /> : null}
      {error ? <ErrorState message={error} title="Payment did not complete" /> : null}
      {!resolving && !resolution?.effectiveTier ? (
        <ProvingUnavailableNotice reason={resolution?.reason} />
      ) : (
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={paying || resolving}
          aria-busy={paying || resolving}
          onClick={() => void pay()}
        >
          {paying
            ? proofStage
              ? 'Preparing payment…'
              : 'Checking proof setup…'
            : resolving
              ? 'Checking proof setup…'
              : 'Pay invoice'}
        </Button>
      )}
    </div>
  );
}

export function PayPage() {
  const { api } = useTacitPay();
  const { observer } = useLive();
  // The status check before paying is a PUBLIC read, so it needs no wallet: read the
  // chain directly whenever a contract is configured, exactly as VerifyPage does.
  // Through the mock alone, a link minted by the CLI always came back "not found",
  // because the mock only knows the invoices it created itself.
  const source = observer ?? api;
  const location = useLocation();
  const navigate = useNavigate();
  // The paste box below: arriving with no fragment is a normal way in (the
  // Receipts empty state links here), not an error.
  const [pastedLink, setPastedLink] = useState('');
  const [data, setData] = useState<PayInvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentTxId, setPaymentTxId] = useState<string | null>(null);

  // `run.cancelled` guards against an out-of-order response: the mock answers first,
  // then the chain-backed observer arrives and re-runs the load — without the guard the
  // slower stale reply can overwrite the newer, correct one (see VerifyPage).
  const load = useCallback(
    async (run: { cancelled: boolean } = { cancelled: false }) => {
      setLoading(true);
      setError(null);
      setData(null);
      setPaymentTxId(null);
      // No fragment is the paste-a-link state, not a failure.
      if (!location.hash) {
        setLoading(false);
        return;
      }
      try {
        const payload = api.decodeLink(location.hash);
        const publicState = await source.getInvoiceStatus(payload.id);
        if (run.cancelled) return;
        setData({ payload, publicState });
      } catch (loadError) {
        if (run.cancelled) return;
        setError(getErrorMessage(loadError));
      } finally {
        if (!run.cancelled) setLoading(false);
      }
    },
    [api, location.hash, source],
  );

  useEffect(() => {
    const run = { cancelled: false };
    void load(run);
    return () => {
      run.cancelled = true;
    };
  }, [load]);

  const invoiceId = data?.payload.id;
  const invoiceExists = data?.publicState.exists;
  useEffect(() => {
    if (!invoiceId || !invoiceExists) return;
    const subscription = source.watchInvoice(invoiceId).subscribe((status) => {
      setData((current) =>
        current ? { ...current, publicState: { ...current.publicState, status } } : current,
      );
    });
    return () => subscription.unsubscribe();
  }, [invoiceExists, invoiceId, source]);

  return (
    <>
      <PageHeader
        eyebrow="Pay invoice"
        title="Review before you pay"
        description="The private payload is read from this page's URL fragment and is never sent to a server."
      />

      <SandboxBanner />

      {loading ? (
        <DetailSkeleton />
      ) : !location.hash ? (
        <EmptyState
          icon={<Link21 size={24} variant="Linear" aria-hidden="true" />}
          title="Paste an invoice link"
          description="A TacitPay invoice travels as a private link — everything after the # stays in your browser and is never sent to a server."
          action={
            <form
              className="flex w-full max-w-xl gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const raw = pastedLink.trim();
                if (!raw) return;
                // Accept a full URL, a /pay#… path, or the bare fragment.
                const hashIndex = raw.indexOf('#');
                const hash = hashIndex >= 0 ? raw.slice(hashIndex) : `#${raw}`;
                setPastedLink('');
                void navigate(`/pay${hash}`);
              }}
            >
              <Input
                value={pastedLink}
                onChange={(event) => setPastedLink(event.target.value)}
                placeholder="http://…/pay#eyJ…"
                aria-label="Invoice link"
              />
              <Button type="submit" disabled={!pastedLink.trim()}>
                Open
              </Button>
            </form>
          }
        />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => void load()}
          title="Could not open this invoice"
        />
      ) : data && !data.publicState.exists ? (
        <EmptyState
          icon={<SearchStatus size={24} variant="Linear" aria-hidden="true" />}
          title="Invoice not found"
          description="No public invoice exists for this ID on the active contract. Ask the merchant for a current link."
        />
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Invoice summary</CardTitle>
                <StatusBadge status={data.publicState.status} />
              </div>
              <CardDescription>Live status from the public contract state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Amount due</p>
                <PrivateAmount amount={data.payload.amount} token={data.payload.token} prominent />
              </div>
              <Separator />
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Memo</dt>
                  <dd className="mt-1 font-medium">{data.payload.memo || 'No memo'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Expires</dt>
                  <dd className="mt-1 font-medium">{formatDateTime(data.payload.exp)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Invoice ID</dt>
                  <dd className="mt-1 break-all font-mono text-sm">{data.payload.id}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {paymentTxId ? (
              <TransactionSuccess
                txId={paymentTxId}
                title="Payment confirmed"
                description="Receipt saved to your private payer state."
              >
                <Button asChild variant="outline" size="sm">
                  <Link to={`/verify/${data.payload.id}`}>
                    <Verify size={16} variant="Linear" aria-hidden="true" />
                    Verify invoice
                  </Link>
                </Button>
              </TransactionSuccess>
            ) : data.publicState.status === 'OPEN' &&
              !(data.payload.exp > 0 && data.payload.exp <= Math.floor(Date.now() / 1000)) ? (
              <WalletGate
                title="Connect to pay"
                description="Your wallet will review and authorize the private payment transaction."
              >
                {() => <PayAction payload={data.payload} onPaid={setPaymentTxId} />}
              </WalletGate>
            ) : (
              <Card>
                <CardHeader>
                  <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <ReceiptText size={22} variant="Linear" aria-hidden="true" />
                  </div>
                  <CardTitle>
                    {data.publicState.status === 'OPEN' ? 'Invoice expired' : 'Payment unavailable'}
                  </CardTitle>
                  <CardDescription>
                    {data.publicState.status === 'OPEN'
                      ? 'This invoice passed its expiry and can no longer be paid.'
                      : `This invoice is ${data.publicState.status.toLowerCase()}.`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/verify/${data.payload.id}`}>View public status</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
