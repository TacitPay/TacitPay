import { Danger, ExportSquare, Refresh } from 'iconsax-reactjs';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';

export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-label="Loading" aria-busy="true" className="space-y-3 rounded-xl border bg-card p-4">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div aria-label="Loading" aria-busy="true" className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 rounded-xl border bg-card p-6 lg:col-span-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-16 w-64 max-w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-10 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
  title = 'Could not load this view',
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <Card className="border-destructive/25 bg-destructive/5">
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Danger size={22} variant="Linear" className="text-destructive" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <Refresh size={16} variant="Linear" aria-hidden="true" />
              Try again
            </Button>
          ) : null}
          {message.startsWith('Your wallet has the invoice token') ? (
            <Button asChild variant="outline" size="sm">
              <a
                href="https://docs.midnight.network/guides/acquire-tokens"
                target="_blank"
                rel="noreferrer"
              >
                <ExportSquare size={16} variant="Linear" aria-hidden="true" />
                Register for DUST
              </a>
            </Button>
          ) : null}
          {message.toLowerCase().includes('proof server') ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">Check proof server</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
