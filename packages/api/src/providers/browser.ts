import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

import { bytes32ToHex } from '../bytes.js';
import type { CircuitIds, NetworkId, TacitPayProviders } from '../types.js';

export type PendingBrowserProviderSlot<
  TName extends 'proofProvider' | 'walletProvider' | 'midnightProvider',
> = {
  readonly status: 'pending';
  readonly slot: TName;
  readonly reason: string;
};

export type BrowserProviderSkeleton = Pick<
  TacitPayProviders,
  'privateStateProvider' | 'publicDataProvider' | 'zkConfigProvider'
> & {
  readonly proofProvider: PendingBrowserProviderSlot<'proofProvider'>;
  readonly walletProvider: PendingBrowserProviderSlot<'walletProvider'>;
  readonly midnightProvider: PendingBrowserProviderSlot<'midnightProvider'>;
};

export type BrowserWalletSlots = Pick<
  TacitPayProviders,
  'proofProvider' | 'walletProvider' | 'midnightProvider'
>;

export type BrowserProviderConfig = {
  readonly networkId: NetworkId;
  readonly accountId: string;
  readonly privateStoragePasswordProvider: () => string | Promise<string>;
  readonly indexerHttpUrl: string;
  readonly indexerWsUrl: string;
  readonly zkConfigBaseUrl: string;
};

const PENDING_REASON =
  'Pending PRD §8.3 Day-3 verification against example-bboard ConnectedAPI methods';

const pendingSlot = <TName extends 'proofProvider' | 'walletProvider' | 'midnightProvider'>(
  slot: TName,
): PendingBrowserProviderSlot<TName> => ({ status: 'pending', slot, reason: PENDING_REASON });

const stretchBrowserPassword = async (passphrase: string, accountId: string): Promise<string> => {
  if (passphrase.length === 0) throw new TypeError('private-state passphrase cannot be empty');
  if (accountId.length === 0) throw new TypeError('accountId cannot be empty');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const salt = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`tacitpay:private-state:${accountId}`),
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', iterations: 210_000, salt },
    key,
    256,
  );
  return `Tp!9${bytes32ToHex(new Uint8Array(bits), 'stretched passphrase')}`;
};

/** Stretches once and retains only the resulting password for this browser session. */
export const createBrowserPrivateStoragePasswordProvider = (
  passphrase: string,
  accountId: string,
): (() => Promise<string>) => {
  const password = stretchBrowserPassword(passphrase, accountId);
  return () => password;
};

/** Builds the verified browser slots without guessing DApp Connector methods. */
export const createBrowserProviderSkeleton = (
  config: BrowserProviderConfig,
): BrowserProviderSkeleton => {
  setNetworkId(config.networkId);
  const browserWebSocket = globalThis.WebSocket as unknown as NonNullable<
    Parameters<typeof indexerPublicDataProvider>[2]
  >;
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'tacitpay-private-state',
      signingKeyStoreName: 'tacitpay-signing-keys',
      privateStoragePasswordProvider: config.privateStoragePasswordProvider,
      accountId: config.accountId,
    }),
    publicDataProvider: indexerPublicDataProvider(
      config.indexerHttpUrl,
      config.indexerWsUrl,
      browserWebSocket,
    ),
    zkConfigProvider: new FetchZkConfigProvider<CircuitIds>(config.zkConfigBaseUrl),
    proofProvider: pendingSlot('proofProvider'),
    walletProvider: pendingSlot('walletProvider'),
    midnightProvider: pendingSlot('midnightProvider'),
  };
};

/** Completes the six-provider object after the Day-3 wallet spike supplies real slots. */
export const completeBrowserProviders = (
  skeleton: BrowserProviderSkeleton,
  walletSlots: BrowserWalletSlots,
): TacitPayProviders => ({
  privateStateProvider: skeleton.privateStateProvider,
  publicDataProvider: skeleton.publicDataProvider,
  zkConfigProvider: skeleton.zkConfigProvider,
  ...walletSlots,
});
