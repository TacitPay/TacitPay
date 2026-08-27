import { Coin, Flash } from 'iconsax-reactjs';
import { type ReactNode, useEffect, useState } from 'react';

import { useTacitPay } from '@/lib/api';
import { endpointsFor } from '@/lib/api/deployment';
import { displayToken, formatAmount } from '@/lib/format';
import type { WalletConnection } from '@/lib/wallet';

import nightLogo from '@/assets/tokens/night.png';
import usdmLogo from '@/assets/tokens/usdm.png';

import { Separator } from './ui/separator';

// One place that knows how to ask a connected wallet about itself — balances,
// addresses, and how to draw them. The header's hover peek and the profile
// page both read from here, so the two views can never drift apart on what
// the wallet actually said.

// DUST carries 15 decimal places (1 DUST = 10^15 specks) — Midnight's own
// denomination, distinct from the 6 the payment tokens use. Two fraction
// digits are plenty for a glanceable balance.
const SPECKS_PER_DUST = 10n ** 15n;
export function formatDust(specks: bigint) {
  const whole = specks / SPECKS_PER_DUST;
  const centis = ((specks % SPECKS_PER_DUST) * 100n) / SPECKS_PER_DUST;
  return `${whole.toLocaleString('en-US')}.${centis.toString().padStart(2, '0')} DUST`;
}

export type WalletBalances = {
  shielded: [string, bigint][] | null;
  unshielded: [string, bigint][] | null;
  dust: bigint | null;
};

export type WalletAddresses = {
  unshielded: string | null;
  shielded: string | null;
  dust: string | null;
  cardano: string | null;
};

// Each currency wears its official mark, taken from the Cardano token
// registry entries their issuers published (NIGHT 0691…4854, USDM
// c48c…444d). A plain coin stands in for any token type this app has never
// met, and DUST carries a flash glyph — Midnight has not published a DUST
// mark yet, and a made-up logo would be worse than an honest glyph.
export function tokenIcon(symbol: string): ReactNode {
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

export function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
}) {
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
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
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

// The wallet's own numbers and addresses, read live from the connector.
// Every getter is optional — a wallet that does not expose one yields null,
// never a zero, because a made-up number in a PRIVACY app's wallet card
// would be the worst kind of bug. The Cardano address comes from Lace's
// OTHER connector (window.cardano, CIP-30) and only when that side is
// already authorized — a passive read must never pop an approval window.
export function useWalletDetails(connection: WalletConnection) {
  const [balances, setBalances] = useState<WalletBalances | 'loading'>('loading');
  const [addresses, setAddresses] = useState<WalletAddresses>({
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

  return { balances, addresses };
}

// The balance list both surfaces share: a section per pool, then Dust on its
// own line — the network's fee resource, not a spendable token, so it stays
// outside the pools.
export function WalletBalanceList({ balances }: { balances: WalletBalances | 'loading' }) {
  const { network } = useTacitPay();
  const known = endpointsFor(network);

  if (balances === 'loading') {
    return <p className="text-sm text-muted-foreground">Reading balances…</p>;
  }

  const tokenRows = (record: [string, bigint][] | null, kind: string) => {
    if (record === null)
      return <p className="text-sm text-muted-foreground">Not exposed by this wallet.</p>;
    if (record.length === 0)
      return <p className="text-sm text-muted-foreground">Nothing {kind} yet.</p>;
    return record.map(([token, amount]) => {
      const symbol = displayToken(token, known);
      return (
        <DetailRow
          key={token}
          icon={tokenIcon(symbol)}
          label={symbol}
          value={amountOnly(amount, symbol)}
        />
      );
    });
  };

  return (
    <>
      <DetailSection title="Shielded">{tokenRows(balances.shielded, 'shielded')}</DetailSection>
      <DetailSection title="Unshielded">
        {tokenRows(balances.unshielded, 'unshielded')}
      </DetailSection>
      <Separator />
      <DetailRow
        icon={<Flash size={14} variant="Linear" aria-hidden="true" className="shrink-0" />}
        label="Dust"
        value={balances.dust === null ? 'Not exposed' : formatDust(balances.dust)}
      />
    </>
  );
}
