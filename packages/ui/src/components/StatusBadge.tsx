import type { InvoiceStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

import { Badge } from './ui/badge';

const statusClasses: Record<InvoiceStatus, string> = {
  OPEN: 'border-transparent bg-[var(--status-open-bg)] text-[var(--status-open-fg)]',
  PAID: 'border-transparent bg-[var(--status-paid-bg)] text-[var(--status-paid-fg)]',
  WITHDRAWN: 'border-transparent bg-[var(--status-withdrawn-bg)] text-[var(--status-withdrawn-fg)]',
  CANCELLED: 'border-transparent bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)]',
};

export function StatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn('tracking-wide', statusClasses[status], className)}>
      {status}
    </Badge>
  );
}
