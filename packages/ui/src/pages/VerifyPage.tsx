import { Eye, EyeSlash, SearchStatus, TickCircle } from 'iconsax-reactjs';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { CopyButton } from '@/components/CopyButton';
import { DetailSkeleton, EmptyState, ErrorState } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { type InvoiceStatus, useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';

interface PublicInvoiceState {
  status: InvoiceStatus;
  expiresAt: number;
  exists: boolean;
}

function VisibilityItem({ children }: { children: string }) {
  return (
    <li className="flex gap-2 text-sm leading-6 text-muted-foreground">
      <TickCircle
        size={17}
        variant="Linear"
        className="mt-1 shrink-0 text-primary"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

export function VerifyPage() {
  const { invoiceId = '' } = useParams<{ invoiceId: string }>();
  const { api } = useTacitPay();
  const [publicState, setPublicState] = useState<PublicInvoiceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!/^[0-9a-f]{64}$/iu.test(invoiceId)) {
        throw new Error('Invoice IDs must be 64 hexadecimal characters.');
      }
      setPublicState(await api.getInvoiceStatus(invoiceId));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setPublicState(null);
    } finally {
      setLoading(false);
    }
  }, [api, invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!publicState?.exists) return;
    const subscription = api.watchInvoice(invoiceId).subscribe((status) => {
      setPublicState((current) => (current ? { ...current, status } : current));
    });
    return () => subscription.unsubscribe();
  }, [api, invoiceId, publicState?.exists]);

  return (
    <>
      <PageHeader
        eyebrow="Public verification"
        title="Invoice status"
        description="No wallet is required. This page reads only the public contract state."
      />

      {loading ? (
        <DetailSkeleton />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => void load()}
          title="Could not verify this invoice"
        />
      ) : publicState && !publicState.exists ? (
        <EmptyState
          icon={<SearchStatus size={24} variant="Linear" aria-hidden="true" />}
          title="Unknown invoice"
          description="This invoice ID does not exist on the active TacitPay contract. Check the ID and network, then try again."
        />
      ) : publicState ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Public record found</CardTitle>
                  <CardDescription className="mt-2">
                    Status updates are watched live from the contract adapter.
                  </CardDescription>
                </div>
                <StatusBadge status={publicState.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Separator />
              <dl className="grid gap-5 md:grid-cols-[1fr_2fr]">
                <div>
                  <dt className="text-sm text-muted-foreground">Exists</dt>
                  <dd className="mt-1 font-medium">Yes</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Expiry</dt>
                  <dd className="mt-1 font-medium">{formatDateTime(publicState.expiresAt)}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-sm text-muted-foreground">Invoice ID</dt>
                  <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <code className="min-w-0 flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-sm">
                      {invoiceId}
                    </code>
                    <CopyButton value={invoiceId} label="Copy ID" />
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Eye size={22} variant="Linear" aria-hidden="true" />
                </div>
                <CardTitle>What an observer can see</CardTitle>
                <CardDescription>Public by design in Wave 1.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <VisibilityItem>
                    The random invoice ID, whether it exists, and its current status.
                  </VisibilityItem>
                  <VisibilityItem>
                    The expiry timestamp and when public state changes occur.
                  </VisibilityItem>
                  <VisibilityItem>
                    A hiding commitment and per-invoice owner and payer tags, not the identities
                    behind them.
                  </VisibilityItem>
                  <VisibilityItem>
                    Wave 1 limitation: escrowed coin value can be visible after payment until the
                    merchant withdraws.
                  </VisibilityItem>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <EyeSlash size={22} variant="Linear" aria-hidden="true" />
                </div>
                <CardTitle>What an observer cannot see</CardTitle>
                <CardDescription>Private commerce details stay off the ledger.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <VisibilityItem>
                    The committed invoice amount or the underlying payment-link preimage.
                  </VisibilityItem>
                  <VisibilityItem>The memo, line items, or other invoice contents.</VisibilityItem>
                  <VisibilityItem>
                    The merchant identity or a link between that merchant's invoices.
                  </VisibilityItem>
                  <VisibilityItem>The payer's wallet address or identity.</VisibilityItem>
                  <VisibilityItem>
                    A proof reveals only its claim, such as “at least X,” never the hidden source
                    data.
                  </VisibilityItem>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
