import { Danger, ExportSquare, Refresh, TickCircle, Wallet3 } from 'iconsax-reactjs';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { truncateHash } from '@/lib/format';
import { useProving } from '@/lib/proving-context';
import {
  clearStoredWalletIdentity,
  connectInjectedWallet,
  listInjectedWallets,
  storeWalletIdentity,
  type DetectedWallet,
  type WalletConnection,
} from '@/lib/wallet';

import { CopyButton } from './CopyButton';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

// The connected banner on its own, for pages that want the connection to
// read as page-level status rather than a lid on one gated section —
// Payments seats it above the pay card while the gate guards only the
// receipts below. Carries its own @container: the card's row/column switch
// must follow whatever box it lands in.
export function ConnectedWalletCard({ connection }: { connection: WalletConnection }) {
  const connectedWallet = listInjectedWallets().find((wallet) => wallet.id === connection.walletId);
  return (
    <div className="@container space-y-6">
      {/* Keyed on the CONTAINER: this card sits full-width on Merchant and in a ~300px pay-page rail, and viewport breakpoints crammed the row layout into the rail. */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 @sm:flex-row @sm:items-center @sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {connectedWallet?.icon ? (
            <span className="relative shrink-0">
              <img
                src={connectedWallet.icon}
                alt=""
                width={40}
                height={40}
                className="size-10 rounded-md"
              />
              <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-card bg-[var(--status-paid-fg)]" />
            </span>
          ) : (
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--status-paid-bg)] text-[var(--status-paid-fg)]">
              <Wallet3 size={20} variant="Linear" aria-hidden="true" />
              <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-card bg-[var(--status-paid-fg)]" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">{connection.walletName} connected</p>
            <code className="block truncate font-mono text-xs text-muted-foreground">
              {truncateHash(connection.address)}
            </code>
            {/* No proving line here — the header's Proving chip already
                carries that status on every page. */}
          </div>
        </div>
        <ChangeWalletActions connection={connection} />
      </div>
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
    </div>
  );
}

// The banner's actions need the same network-scoped disconnect the gate
// performs; a tiny inner component keeps the hooks with the buttons.
function ChangeWalletActions({ connection }: { connection: WalletConnection }) {
  const { network } = useTacitPay();
  const { setConnection } = useProving();
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton value={connection.address} label="Copy address" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          clearStoredWalletIdentity(network);
          setConnection(null);
        }}
      >
        Change wallet
      </Button>
    </div>
  );
}

export function WalletGate({
  children,
  title = 'Connect your wallet',
  description = 'Choose a detected Midnight wallet to continue.',
}: {
  children(connection: WalletConnection): ReactNode;
  title?: string;
  description?: string;
}) {
  const { network } = useTacitPay();
  const { connection, setConnection } = useProving();
  const [wallets, setWallets] = useState<DetectedWallet[]>(listInjectedWallets);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setWallets(listInjectedWallets());
    setError(null);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 300);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  async function connect(wallet: DetectedWallet) {
    if (!wallet.supported) return;
    setConnectingId(wallet.id);
    setError(null);
    try {
      setConnection(await connectInjectedWallet(wallet, network));
      storeWalletIdentity(network, wallet.injectionKey);
    } catch (connectionError) {
      setError(getErrorMessage(connectionError));
    } finally {
      setConnectingId(null);
    }
  }

  if (connection) {
    return (
      <div className="space-y-6">
        <ConnectedWalletCard connection={connection} />
        {children(connection)}
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Wallet3 size={22} variant="Linear" aria-hidden="true" />
          </div>
          <CardTitle>No Midnight wallet detected</CardTitle>
          <CardDescription>
            Install or enable Lace or 1AM, then refresh this page. TacitPay checks every wallet
            injected under
            <code className="ml-1 font-mono">window.midnight</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <a
              href="https://docs.midnight.network/getting-started/installation"
              target="_blank"
              rel="noreferrer"
            >
              <ExportSquare size={16} variant="Linear" aria-hidden="true" />
              Wallet setup guide
            </a>
          </Button>
          <Button type="button" variant="outline" onClick={refresh}>
            <Refresh size={16} variant="Linear" aria-hidden="true" />
            Check again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="@container space-y-4">
        <div className="grid gap-3 @md:grid-cols-2">
          {wallets.map((wallet) => (
            <button
              key={`${wallet.id}:${wallet.injectionKey}`}
              type="button"
              disabled={connectingId !== null || !wallet.supported}
              onClick={() => void connect(wallet)}
              className="flex min-h-20 items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {wallet.icon ? (
                <img
                  src={wallet.icon}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-md"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-base font-semibold text-muted-foreground"
                >
                  {wallet.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="block truncate text-sm font-medium">{wallet.name}</span>
                  {wallet.apiVersion ? (
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      API {wallet.apiVersion}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`mt-1 block text-xs ${wallet.supported ? 'text-muted-foreground' : 'text-destructive'}`}
                >
                  {connectingId === wallet.id
                    ? 'Waiting for approval…'
                    : wallet.supported
                      ? 'Connect to check in-browser proving'
                      : wallet.unsupportedReason}
                </span>
                {wallet.apiVersionWarning ? (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {wallet.apiVersionWarning}
                  </span>
                ) : null}
              </span>
              {!wallet.supported ? (
                <Danger size={18} variant="Linear" aria-hidden="true" />
              ) : connectingId === wallet.id ? (
                <Refresh
                  size={18}
                  variant="Linear"
                  className="motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <TickCircle size={18} variant="Linear" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/25 bg-destructive/5 p-3"
          >
            <p className="text-sm font-medium text-destructive">Wallet connection failed</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={refresh}>
          <Refresh size={16} variant="Linear" aria-hidden="true" />
          Refresh wallets
        </Button>
      </CardContent>
    </Card>
  );
}
