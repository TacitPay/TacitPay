import { Danger, LogoutCurve, Setting2, Wallet3 } from 'iconsax-reactjs';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CopyButton } from '@/components/CopyButton';
import { ErrorState, TableSkeleton } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { PrivateAmount } from '@/components/PrivateAmount';
import { SandboxBanner } from '@/components/SandboxBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWalletDetails, WalletBalanceList } from '@/components/WalletDetails';
import { WalletGate } from '@/components/WalletGate';
import { type InvoiceStatus, type InvoiceView, type ReceiptView, useTacitPay } from '@/lib/api';
import { describeNetwork } from '@/lib/api/deployment';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { useProving } from '@/lib/proving-context';
import {
  clearStoredWalletIdentity,
  listInjectedWallets,
  type WalletConnection,
} from '@/lib/wallet';

// The wallet's own page, opened by clicking the header pill. There is no
// account behind TacitPay — the wallet IS the profile — so everything here
// is either read live from the connector (identity, balances) or derived
// from the same private state the dashboard reads (activity). The hover
// peek shows the truncated preview; this page holds the full strings.

// The peek truncates; here the whole string is the point — a profile is
// where you come to copy an address without trusting an ellipsis.
function FullAddressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border bg-background p-3">
      <div className="min-w-0 space-y-1">
        <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          {label}
        </p>
        <code className="block font-mono text-xs leading-5 break-all">{value}</code>
      </div>
      <CopyButton value={value} label={`Copy ${label.toLowerCase()} address`} iconOnly />
    </div>
  );
}

// A count in the app's tile grammar: micro-eyebrow label, big tabular figure.
function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

// Sums are kept per token — a wallet that invoiced in two currencies gets
// two lines, never one number pretending the currencies add.
function totalsByToken(entries: readonly { token: string; amount: bigint }[]): [string, bigint][] {
  const sums = new Map<string, bigint>();
  for (const entry of entries) sums.set(entry.token, (sums.get(entry.token) ?? 0n) + entry.amount);
  return [...sums.entries()];
}

function MoneyRow({ label, totals }: { label: string; totals: [string, bigint][] }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {totals.length === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="flex min-w-0 flex-col items-end gap-1">
          {totals.map(([token, amount]) => (
            <PrivateAmount key={token} amount={amount} token={token} />
          ))}
        </span>
      )}
    </div>
  );
}

function ProfileBody({ connection }: { connection: WalletConnection }) {
  const { api, network } = useTacitPay();
  const { setConnection } = useProving();
  const { balances, addresses } = useWalletDetails(connection);
  const [invoices, setInvoices] = useState<InvoiceView[] | null>(null);
  const [receipts, setReceipts] = useState<ReceiptView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoaded(false);
    // Both halves in one settle, exactly like the dashboard: a merchant-side
    // failure must not blank the payer's numbers, nor the other way round.
    const [mine, paid] = await Promise.allSettled([api.listMyInvoices(), api.listMyReceipts()]);
    setInvoices(mine.status === 'fulfilled' ? mine.value : null);
    setReceipts(paid.status === 'fulfilled' ? paid.value : null);
    if (mine.status === 'rejected' && paid.status === 'rejected') {
      setError(getErrorMessage(mine.reason));
    }
    setLoaded(true);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const walletIcon = listInjectedWallets().find(
    (wallet) => wallet.id === connection.walletId,
  )?.icon;

  const byStatus = (status: InvoiceStatus) =>
    invoices?.filter((invoice) => invoice.status === status) ?? [];
  // Tiles speak the ledger's status words; money rows speak the dashboard's
  // action words — Ready to withdraw is PAID money, Collected is WITHDRAWN.
  const readyTotals = totalsByToken(byStatus('PAID'));
  const collectedTotals = totalsByToken(byStatus('WITHDRAWN'));
  const paidTotals = totalsByToken(receipts ?? []);
  const lastPaidAt = receipts?.length ? Math.max(...receipts.map((r) => r.paidAt)) : null;

  function disconnect() {
    clearStoredWalletIdentity(network);
    setConnection(null);
  }

  return (
    <div className="space-y-5">
      {/* Identity: who this wallet is, in full. */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {walletIcon ? (
              <img src={walletIcon} alt="" width={40} height={40} className="size-10 rounded-md" />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Wallet3 size={20} variant="Linear" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <CardTitle>{connection.walletName}</CardTitle>
            </div>
            <span className="ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {describeNetwork(network)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.unshielded ? (
              <FullAddressRow label="Unshielded" value={addresses.unshielded} />
            ) : null}
            {addresses.shielded ? (
              <FullAddressRow label="Shielded" value={addresses.shielded} />
            ) : null}
            {addresses.dust ? <FullAddressRow label="Dust" value={addresses.dust} /> : null}
            {addresses.cardano ? (
              <FullAddressRow label="Cardano" value={addresses.cardano} />
            ) : null}
          </div>
          {/* The version warning used to live in the wallet dialog this page
              replaced; the identity card is its natural home now. */}
          {connection.apiVersionWarning ? (
            <div role="status" className="flex items-start gap-2 rounded-md border bg-muted/35 p-3">
              <Danger
                size={18}
                variant="Linear"
                className="mt-0.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">{connection.apiVersionWarning}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Statistics: the dashboard's three rooms, counted instead of listed. */}
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !loaded ? (
        <TableSkeleton />
      ) : (
        <section className="grid gap-5 lg:grid-cols-3">
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="text-base">Invoices</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              {invoices === null ? (
                <p className="text-sm text-muted-foreground">Could not read invoice state.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <StatTile label="Open" value={byStatus('OPEN').length} />
                    <StatTile label="Paid" value={byStatus('PAID').length} />
                    <StatTile label="Withdrawn" value={byStatus('WITHDRAWN').length} />
                    <StatTile label="Cancelled" value={byStatus('CANCELLED').length} />
                  </div>
                  <div className="space-y-2">
                    <MoneyRow label="Ready to withdraw" totals={readyTotals} />
                    <MoneyRow label="Collected" totals={collectedTotals} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="text-base">Payments</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              {receipts === null ? (
                <p className="text-sm text-muted-foreground">Could not read payer state.</p>
              ) : (
                <>
                  <StatTile label="Payments made" value={receipts.length} />
                  <div className="space-y-2">
                    <MoneyRow label="Total paid" totals={paidTotals} />
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="shrink-0 text-muted-foreground">Last payment</span>
                      <span className="text-right font-medium">
                        {lastPaidAt === null ? '—' : formatDateTime(lastPaidAt)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="text-base">Balances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <WalletBalanceList balances={balances} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Session: the two things you can DO from here. Network and contract
          keep their own room in Settings — no duplication. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>
            Network and contract live in Settings. Disconnecting ends this browser session only —
            your records stay in your wallet and private state.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">
              <Setting2 size={16} variant="Linear" aria-hidden="true" />
              Open settings
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={disconnect}>
            <LogoutCurve size={16} variant="Linear" aria-hidden="true" />
            Disconnect wallet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfilePage() {
  const { connection } = useProving();

  return (
    <>
      <PageHeader
        title="Your wallet"
        description="The wallet is the account. Everything here is read live and stays between it and this browser."
      />
      <SandboxBanner />
      {connection ? (
        <ProfileBody connection={connection} />
      ) : (
        <WalletGate
          title="Connect to open your profile"
          description="The profile is the wallet's own numbers — connect to read them."
        >
          {() => null}
        </WalletGate>
      )}
    </>
  );
}
