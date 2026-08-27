import { Coin, Danger, ExportSquare, Flash, LogoutCurve, Refresh, Wallet3 } from 'iconsax-reactjs';
import { type ReactNode, useEffect, useState } from 'react';

import { useTacitPay } from '@/lib/api';
import { describeNetwork, endpointsFor } from '@/lib/api/deployment';
import { getErrorMessage } from '@/lib/errors';
import { displayToken, formatAmount, truncateHash } from '@/lib/format';
import { getWalletProvingCapability } from '@/lib/proving';
import { useProving } from '@/lib/proving-context';
import {
  clearStoredWalletIdentity,
  connectInjectedWallet,
  listInjectedWallets,
  storeWalletIdentity,
  type DetectedWallet,
  type WalletConnection,
} from '@/lib/wallet';

import nightLogo from '@/assets/tokens/night.png';
import usdmLogo from '@/assets/tokens/usdm.png';

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

// The header's wallet control. WalletGate still owns the in-page connect flow
// for the routes that cannot run without a wallet; this is the always-present
// door, so the state is legible from any page and connecting never requires
// finding the right screen first. Both read the same session state from
// useProving, so connecting in either place lights up the other.

// DUST carries 15 decimal places (1 DUST = 10^15 specks) — Midnight's own
// denomination, distinct from the 6 the payment tokens use. Two fraction
// digits are plenty for a glanceable balance.
const SPECKS_PER_DUST = 10n ** 15n;
function formatDust(specks: bigint) {
  const whole = specks / SPECKS_PER_DUST;
  const centis = ((specks % SPECKS_PER_DUST) * 100n) / SPECKS_PER_DUST;
  return `${whole.toLocaleString('en-US')}.${centis.toString().padStart(2, '0')} DUST`;
}

type PeekBalances = {
  shielded: [string, bigint][] | null;
  unshielded: [string, bigint][] | null;
  dust: bigint | null;
};

// Each currency wears its official mark, taken from the Cardano token
// registry entries their issuers published (NIGHT 0691…4854, USDM
// c48c…444d). A plain coin stands in for any token type this app has never
// met, and DUST carries the flash below — Midnight has not published a DUST
// mark yet, and a made-up logo would be worse than an honest glyph.
function tokenIcon(symbol: string): ReactNode {
  if (symbol === 'NIGHT') {
    // The official mark is black on transparent — it needs the white disc
    // every wallet seats it on, or it disappears into the dark theme.
    return (
      <img
        src={nightLogo}
        alt=""
        width={16}
        height={16}
        className="size-4 shrink-0 rounded-full bg-white p-px"
      />
    );
  }
  if (symbol.includes('USDM')) {
    return <img src={usdmLogo} alt="" width={16} height={16} className="size-4 shrink-0" />;
  }
  return <Coin size={14} variant="Linear" aria-hidden="true" className="shrink-0" />;
}

function PeekRow({ icon, label, value }: { icon?: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="min-w-0 text-right font-medium">{value}</span>
    </div>
  );
}

// A pool per section, in the app's own eyebrow grammar: each register keeps
// its assets under its own roof instead of repeating the pool name per row.
function PeekSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

// The ticker already sits on the row's label, so the value column carries the
// bare number — formatAmount's " SYMBOL" suffix is sliced off, not re-derived.
function amountOnly(amount: bigint, symbol: string) {
  return formatAmount(amount, symbol).slice(0, -(symbol.length + 1));
}

// Bech32 (BIP-173), encode-only, for displaying the Cardano address the
// CIP-30 connector returns as raw hex. Vendored rather than depended on: the
// algorithm is thirty lines and fixed forever, and the one npm package that
// provides it is not in this tree. Display-only — nothing is derived from it.
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
function bech32Polymod(values: number[]) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i += 1) if ((top >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}
function bech32Encode(hrp: string, data: Uint8Array) {
  const words: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const byte of data) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      words.push((acc >> bits) & 31);
    }
  }
  if (bits > 0) words.push((acc << (5 - bits)) & 31);
  const expanded = [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0];
  for (const c of hrp) expanded.push(c.charCodeAt(0) & 31);
  const poly = bech32Polymod([...expanded, ...words, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum = Array.from({ length: 6 }, (_, i) => (poly >> (5 * (5 - i))) & 31);
  return `${hrp}1${[...words, ...checksum].map((w) => BECH32_CHARSET[w]).join('')}`;
}

type PeekAddresses = {
  unshielded: string | null;
  shielded: string | null;
  dust: string | null;
  cardano: string | null;
};

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

// What hovering the pill reveals: the wallet's own numbers and addresses,
// read live from the connector. Every getter is optional — a wallet that
// does not expose one renders "Not exposed", never a zero, because a made-up
// number in a PRIVACY app's wallet card would be the worst kind of bug. The
// Cardano address comes from Lace's OTHER connector (window.cardano, CIP-30)
// and only when that side is already authorized — a hover must never pop an
// approval window.
function WalletPeek({
  connection,
  onDisconnect,
}: {
  connection: WalletConnection;
  onDisconnect(): void;
}) {
  const { network } = useTacitPay();
  const known = endpointsFor(network);
  const [balances, setBalances] = useState<PeekBalances | 'loading'>('loading');
  const [addresses, setAddresses] = useState<PeekAddresses>({
    unshielded: connection.address,
    shielded: null,
    dust: null,
    cardano: null,
  });

  useEffect(() => {
    let cancelled = false;
    const call = (name: string): Promise<unknown> => {
      const fn = (connection.api as Record<string, unknown>)[name];
      if (typeof fn !== 'function') return Promise.reject(new Error('not exposed'));
      return Promise.resolve((fn as () => Promise<unknown>).call(connection.api));
    };
    const entries = (result: PromiseSettledResult<unknown>): [string, bigint][] | null =>
      result.status === 'fulfilled' && result.value && typeof result.value === 'object'
        ? Object.entries(result.value as Record<string, unknown>).filter(
            (entry): entry is [string, bigint] => typeof entry[1] === 'bigint',
          )
        : null;
    const field = (result: PromiseSettledResult<unknown>, key: string): string | null =>
      result.status === 'fulfilled' &&
      result.value !== null &&
      typeof result.value === 'object' &&
      typeof (result.value as Record<string, unknown>)[key] === 'string'
        ? ((result.value as Record<string, string>)[key] ?? null)
        : null;

    void (async () => {
      const [shielded, unshielded, dust, shieldedAddr, unshieldedAddr, dustAddr] =
        await Promise.allSettled([
          call('getShieldedBalances'),
          call('getUnshieldedBalances'),
          call('getDustBalance'),
          call('getShieldedAddresses'),
          call('getUnshieldedAddress'),
          call('getDustAddress'),
        ]);
      if (cancelled) return;
      const dustBalance =
        dust.status === 'fulfilled' &&
        dust.value !== null &&
        typeof dust.value === 'object' &&
        typeof (dust.value as { balance?: unknown }).balance === 'bigint'
          ? (dust.value as { balance: bigint }).balance
          : null;
      setBalances({
        shielded: entries(shielded),
        unshielded: entries(unshielded),
        dust: dustBalance,
      });
      setAddresses((current) => ({
        ...current,
        shielded: field(shieldedAddr, 'shieldedAddress'),
        unshielded: field(unshieldedAddr, 'unshieldedAddress') ?? connection.address,
        dust: field(dustAddr, 'dustAddress'),
      }));
    })();

    // The Cardano side, silently or not at all: isEnabled() true means the
    // user already granted it, so enable() resolves without a popup.
    void (async () => {
      try {
        const lace = (
          window as {
            cardano?: Record<
              string,
              { isEnabled?(): Promise<boolean>; enable?(): Promise<unknown> }
            >;
          }
        ).cardano?.lace;
        if (!lace?.isEnabled || !(await lace.isEnabled()) || !lace.enable) return;
        const api = (await lace.enable()) as {
          getUsedAddresses?(): Promise<string[]>;
          getChangeAddress?(): Promise<string>;
        };
        const hex = (await api.getUsedAddresses?.())?.[0] ?? (await api.getChangeAddress?.());
        if (!hex || cancelled) return;
        const bytes = Uint8Array.from(hex.match(/.{2}/gu)?.map((b) => parseInt(b, 16)) ?? []);
        if (bytes.length === 0) return;
        const prefix = (bytes[0] & 0x0f) === 1 ? 'addr' : 'addr_test';
        const encoded = bech32Encode(prefix, bytes);
        if (!cancelled) setAddresses((current) => ({ ...current, cardano: encoded }));
      } catch {
        // No Cardano row is better than a wrong one.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connection]);

  const tokenRows = (record: [string, bigint][] | null, kind: string) => {
    if (record === null)
      return <p className="text-sm text-muted-foreground">Not exposed by this wallet.</p>;
    if (record.length === 0)
      return <p className="text-sm text-muted-foreground">Nothing {kind} yet.</p>;
    return record.map(([token, amount]) => {
      const symbol = displayToken(token, known);
      return (
        <PeekRow
          key={token}
          icon={tokenIcon(symbol)}
          label={symbol}
          value={amountOnly(amount, symbol)}
        />
      );
    });
  };

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

      <PeekSection title="Addresses">
        {addresses.unshielded ? (
          <AddressRow label="Unshielded" value={addresses.unshielded} />
        ) : null}
        {addresses.shielded ? <AddressRow label="Shielded" value={addresses.shielded} /> : null}
        {addresses.dust ? <AddressRow label="Dust" value={addresses.dust} /> : null}
        {addresses.cardano ? <AddressRow label="Cardano" value={addresses.cardano} /> : null}
      </PeekSection>

      <Separator />

      {balances === 'loading' ? (
        <p className="text-sm text-muted-foreground">Reading balances…</p>
      ) : (
        <>
          <PeekSection title="Shielded">{tokenRows(balances.shielded, 'shielded')}</PeekSection>
          <PeekSection title="Unshielded">
            {tokenRows(balances.unshielded, 'unshielded')}
          </PeekSection>
          <Separator />
          <PeekRow
            icon={<Flash size={14} variant="Linear" aria-hidden="true" className="shrink-0" />}
            label="Dust"
            value={balances.dust === null ? 'Not exposed' : formatDust(balances.dust)}
          />
        </>
      )}

      <Separator />

      {/* The way out, without the dialog's ceremony: same clear-and-null the
          dialog performs, one hover away. */}
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
      {connection ? (
        // Connected: the address IS the label. A live dot rather than the
        // word "connected", because the row has to survive a narrow header.
        // Hovering peeks at the wallet — balances and addresses — without
        // the ceremony of the dialog; clicking still opens it.
        <HoverCard openDelay={200} closeDelay={150}>
          {/* Dialog OUTSIDE, hover INSIDE: the hover trigger is the popper's
              anchor, and it must hold the real button node first-hand — ref
              forwarding through a second Slot left the anchor empty and the
              card parked at Radix's off-screen translate(0,-200%). */}
          <DialogTrigger asChild>
            <HoverCardTrigger asChild>
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
                <code className="hidden font-mono sm:inline">
                  {truncateHash(connection.address)}
                </code>
                <Wallet3 size={15} variant="Linear" aria-hidden="true" className="sm:hidden" />
              </button>
            </HoverCardTrigger>
          </DialogTrigger>
          <HoverCardContent align="end" className="w-96">
            <WalletPeek connection={connection} onDisconnect={disconnect} />
          </HoverCardContent>
        </HoverCard>
      ) : (
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
      )}

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
