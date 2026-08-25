import { ExportSquare, TickCircle } from 'iconsax-reactjs';
import type { ReactNode } from 'react';

import { EXPLORER_URL, truncateHash } from '@/lib/format';

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
            <h2 className="font-semibold">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        <div className="rounded-md border bg-background/80 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Transaction ID</p>
          <code className="block overflow-hidden font-mono text-sm text-ellipsis">
            {truncateHash(txId, 12)}
          </code>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={txId} label="Copy txId" />
          <Button asChild variant="outline" size="sm">
            <a href={EXPLORER_URL} target="_blank" rel="noreferrer">
              <ExportSquare size={16} variant="Linear" aria-hidden="true" />
              Open explorer
            </a>
          </Button>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
