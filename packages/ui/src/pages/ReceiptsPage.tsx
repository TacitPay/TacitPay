import { ReceiptText, Verify } from 'iconsax-reactjs';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorState, TableSkeleton } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { SandboxBanner } from '@/components/SandboxBanner';
import { PrivateAmount } from '@/components/PrivateAmount';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WalletGate } from '@/components/WalletGate';
import { type ReceiptView, useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';

function ReceiptsList() {
  const { api } = useTacitPay();
  const [receipts, setReceipts] = useState<ReceiptView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        title="No receipts yet"
        description="Pay an invoice from its private link and the receipt will be saved to your payer state here."
        action={
          <Button asChild variant="outline">
            <Link to="/pay">Open an invoice link</Link>
          </Button>
        }
      />
    );
  }

  return (
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
          {receipts.map((receipt) => (
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
  );
}

export function ReceiptsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Payer"
        title="Your receipts"
        description="Receipts are kept in private payer state; only settlement status is public."
      />
      <SandboxBanner />
      <WalletGate
        title="Connect a payer wallet"
        description="Connect the wallet that paid your invoices to unlock its private receipts."
      >
        {() => <ReceiptsList />}
      </WalletGate>
    </>
  );
}
