import { ExportSquare, LogoutCurve, Refresh, Wallet3 } from 'iconsax-reactjs';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTacitPay } from '@/lib/api';
import { describeNetwork } from '@/lib/api/deployment';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';
import { Separator } from './ui/separator';
import { DetailSection, useWalletDetails, WalletBalanceList } from './WalletDetails';

// The header's wallet control. WalletGate still owns the in-page connect flow
// for the routes that cannot run without a wallet; this is the always-present
// door, so the state is legible from any page and connecting never requires
// finding the right screen first. Both read the same session state from
// useProving, so connecting in either place lights up the other.

// A fixed label column, so every address starts on the same left edge —
// three different label widths otherwise scatter the mono column.
function AddressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <code className="truncate font-mono text-xs">{truncateHash(value, 8)}</code>
      <CopyButton value={value} label={`Copy ${label.toLowerCase()} address`} iconOnly />
    </div>
  );
}

// What hovering the pill reveals: the wallet's own numbers and addresses via
// useWalletDetails, truncated to peek size. The full strings — and the rest
// of the wallet's story — live on /profile, which the pill's click opens.
function WalletPeek({
  connection,
  onDisconnect,
}: {
  connection: WalletConnection;
  onDisconnect(): void;
}) {
  const { network } = useTacitPay();
  const { balances, addresses } = useWalletDetails(connection);

  // The wallet's own face, as it injected it: Lace wears Lace's mark, 1AM
  // wears its own. The green dot stays on the header pill; here the identity
  // does the talking.
  const walletIcon = listInjectedWallets().find(
    (wallet) => wallet.id === connection.walletId,
  )?.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {walletIcon ? (
          <img src={walletIcon} alt="" width={20} height={20} className="size-5 rounded-md" />
        ) : (
          <span
            className="size-2 shrink-0 rounded-full bg-[var(--status-paid-fg)]"
            aria-hidden="true"
          />
        )}
        <p className="text-sm font-semibold">{connection.walletName}</p>
        <span className="ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {describeNetwork(network)}
        </span>
      </div>

      <DetailSection title="Addresses">
        {addresses.unshielded ? (
          <AddressRow label="Unshielded" value={addresses.unshielded} />
        ) : null}
        {addresses.shielded ? <AddressRow label="Shielded" value={addresses.shielded} /> : null}
        {addresses.dust ? <AddressRow label="Dust" value={addresses.dust} /> : null}
        {addresses.cardano ? <AddressRow label="Cardano" value={addresses.cardano} /> : null}
      </DetailSection>

      <Separator />

      <WalletBalanceList balances={balances} />

      <Separator />

      {/* The way out, without any page's ceremony: the same clear-and-null
          the profile's Session card performs, one hover away. */}
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={onDisconnect}>
        <LogoutCurve size={16} variant="Linear" aria-hidden="true" />
        Disconnect
      </Button>
    </div>
  );
}

export function WalletButton() {
  const { network } = useTacitPay();
  const { connection, setConnection } = useProving();
  const navigate = useNavigate();
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

  if (connection) {
    // Connected: the address IS the label. A live dot rather than the word
    // "connected", because the row has to survive a narrow header. Hovering
    // peeks at the wallet — balances and addresses — and clicking opens the
    // wallet's own page at /profile; the old connected dialog said nothing
    // the peek doesn't.
    return (
      <HoverCard openDelay={200} closeDelay={150}>
        {/* The hover trigger is the popper's anchor, and it must hold the
            real button node first-hand — ref forwarding through a second
            Slot once left the anchor empty and the card parked at Radix's
            off-screen translate(0,-200%). */}
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label={`Open wallet profile: ${connection.walletName}, ${truncateHash(connection.address)}`}
            title="Wallet profile"
            className="inline-flex h-9 items-center gap-2 rounded-full border bg-card px-2.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3"
          >
            <span
              className="size-2 shrink-0 rounded-full bg-[var(--status-paid-fg)]"
              aria-hidden="true"
            />
            <code className="hidden font-mono sm:inline">{truncateHash(connection.address)}</code>
            <Wallet3 size={15} variant="Linear" aria-hidden="true" className="sm:hidden" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent align="end" className="w-96">
          <WalletPeek connection={connection} onDisconnect={disconnect} />
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Connect wallet"
          title="Connect wallet"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3.5"
        >
          <Wallet3 size={15} variant="Linear" aria-hidden="true" />
          <span className="hidden sm:inline">Connect wallet</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
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
      </DialogContent>
    </Dialog>
  );
}
