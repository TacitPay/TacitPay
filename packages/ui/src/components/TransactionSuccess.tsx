import { ExportSquare, TickCircle } from 'iconsax-reactjs';
import type { ReactNode } from 'react';

import { useTacitPay } from '@/lib/api';
import { getContractAddress } from '@/lib/api/deployment';
import { truncateHash } from '@/lib/format';

import { CopyButton } from './CopyButton';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

export function TransactionSuccess({
  txId,
  title = 'Transaction confirmed',
  description,
  children,
}: {
  txId: string;
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  const { live, network } = useTacitPay();
  const contract = getContractAddress(network);
  const explorerHref =
    live && network === 'preview' && contract
      ? `https://preview.midnightexplorer.com/contracts/${contract}`
      : null;
  return (
    <Card className="border-[color:var(--status-paid-fg)]/20 bg-[var(--status-paid-bg)]/35">
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <TickCircle
            size={24}
            variant="Bold"
            className="shrink-0 text-[var(--status-paid-fg)]"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <h2 className="font-semibold">
              {title}
              {live ? null : (
                <span className="ml-2 rounded border border-dashed px-1.5 py-0.5 align-middle font-mono text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                  Simulated
                </span>
              )}
            </h2>
            {live ? null : (
              <p className="text-sm text-muted-foreground">
                Sandbox — nothing reached a chain. Ids on this card are stubs.
              </p>
            )}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        <div className="rounded-md border bg-background/80 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {live ? 'Transaction ID' : 'Simulated transaction ID'}
          </p>
          <code className="block overflow-hidden font-mono text-sm text-ellipsis">
            {truncateHash(txId, 12)}
          </code>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={txId} label="Copy txId" />
          {/* Wallets report the ledger IDENTIFIER while explorers index the
              HASH, so a tx deep-link is not yet possible — the contract page
              lists every call and is always right. Preview-only: local has no
              explorer, and the sandbox has no chain at all. */}
          {explorerHref ? (
            <Button asChild variant="outline" size="sm">
              <a href={explorerHref} target="_blank" rel="noreferrer">
                <ExportSquare size={16} variant="Linear" aria-hidden="true" />
                View contract on explorer
              </a>
            </Button>
          ) : null}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
