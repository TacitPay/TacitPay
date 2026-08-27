import { Danger, ExportSquare, LogoutCurve, Refresh, Wallet3 } from 'iconsax-reactjs';
import { useEffect, useState } from 'react';

import { useTacitPay } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { truncateHash } from '@/lib/format';
import { getWalletProvingCapability } from '@/lib/proving';
import { useProving } from '@/lib/proving-context';
import {
  clearStoredWalletIdentity,
  connectInjectedWallet,
  listInjectedWallets,
  storeWalletIdentity,
  type DetectedWallet,
} from '@/lib/wallet';

import { CopyButton } from './CopyButton';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

// The header's wallet control. WalletGate still owns the in-page connect flow
// for the routes that cannot run without a wallet; this is the always-present
// door, so the state is legible from any page and connecting never requires
// finding the right screen first. Both read the same session state from
// useProving, so connecting in either place lights up the other.

export function WalletButton() {
  const { network } = useTacitPay();
  const { connection, setConnection } = useProving();
  const [open, setOpen] = useState(false);
  const [wallets, setWallets] = useState<DetectedWallet[]>(listInjectedWallets);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rescan every time the dialog opens. Injection is asynchronous — a scan at
  // mount can miss a wallet that arrives a moment later — and the user may
  // have installed or unlocked one since the page loaded.
  useEffect(() => {
    if (!open) return;
    setWallets(listInjectedWallets());
    setError(null);
  }, [open]);

  async function connect(wallet: DetectedWallet) {
    if (!wallet.supported) return;
    setConnectingId(wallet.id);
    setError(null);
    try {
      setConnection(await connectInjectedWallet(wallet, network));
      storeWalletIdentity(network, wallet.injectionKey);
      setOpen(false);
    } catch (connectionError) {
      setError(getErrorMessage(connectionError));
    } finally {
      setConnectingId(null);
    }
  }

  function disconnect() {
    clearStoredWalletIdentity(network);
    setConnection(null);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {connection ? (
          // Connected: the address IS the label. A live dot rather than the
          // word "connected", because the row has to survive a narrow header.
          <button
            type="button"
            aria-label={`Wallet: ${connection.walletName}, ${truncateHash(connection.address)}`}
            title={connection.walletName}
            className="inline-flex h-9 items-center gap-2 rounded-full border bg-card px-2.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3"
          >
            <span
              className="size-2 shrink-0 rounded-full bg-[var(--status-paid-fg)]"
              aria-hidden="true"
            />
            <code className="hidden font-mono sm:inline">{truncateHash(connection.address)}</code>
            <Wallet3 size={15} variant="Linear" aria-hidden="true" className="sm:hidden" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Connect wallet"
            title="Connect wallet"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3.5"
          >
            <Wallet3 size={15} variant="Linear" aria-hidden="true" />
            <span className="hidden sm:inline">Connect wallet</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {connection ? (
          <>
            <DialogHeader>
              <DialogTitle>{connection.walletName} connected</DialogTitle>
              <DialogDescription>{getWalletProvingCapability(connection)}</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Address</p>
              <code className="mt-1 block font-mono text-sm break-all">{connection.address}</code>
            </div>
            {connection.apiVersionWarning ? (
              <div
                role="status"
                className="flex items-start gap-2 rounded-md border bg-muted/35 p-3"
              >
                <Danger
                  size={18}
                  variant="Linear"
                  className="mt-0.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">{connection.apiVersionWarning}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <CopyButton value={connection.address} label="Copy address" />
              <Button type="button" variant="outline" size="sm" onClick={disconnect}>
                <LogoutCurve size={16} variant="Linear" aria-hidden="true" />
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Connect a wallet</DialogTitle>
              <DialogDescription>
                Nothing is published until you approve a transaction. TacitPay reads every wallet
                injected under <code className="font-mono">window.midnight</code>.
              </DialogDescription>
            </DialogHeader>

            {wallets.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No Midnight wallet detected. Install or enable Lace or 1AM, then check again.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a
                      href="https://docs.midnight.network/getting-started/installation"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExportSquare size={16} variant="Linear" aria-hidden="true" />
                      Wallet setup guide
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setWallets(listInjectedWallets())}
                  >
                    <Refresh size={16} variant="Linear" aria-hidden="true" />
                    Check again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {wallets.map((wallet) => (
                  <button
                    key={`${wallet.id}:${wallet.injectionKey}`}
                    type="button"
                    disabled={connectingId !== null || !wallet.supported}
                    onClick={() => void connect(wallet)}
                    className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {wallet.icon ? (
                      <img
                        src={wallet.icon}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 shrink-0 rounded-md"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground"
                      >
                        {wallet.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{wallet.name}</span>
                      <span
                        className={`block text-xs ${wallet.supported ? 'text-muted-foreground' : 'text-destructive'}`}
                      >
                        {connectingId === wallet.id
                          ? 'Waiting for approval…'
                          : wallet.supported
                            ? 'Approve in the wallet to connect'
                            : wallet.unsupportedReason}
                      </span>
                    </span>
                    {connectingId === wallet.id ? (
                      <Refresh
                        size={16}
                        variant="Linear"
                        className="shrink-0 motion-safe:animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                ))}
              </div>
            )}

            {error ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/25 bg-destructive/5 p-3"
              >
                <p className="text-sm font-medium text-destructive">Wallet connection failed</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
