import type { ConnectedAPI, WalletConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  type CoinPublicKey,
  CostModel,
  type EncPublicKey,
  type FinalizedTransaction,
  Transaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  MidnightProvider,
  ProofProvider,
  UnboundTransaction,
  WalletProvider,
  ZKConfigProvider,
} from '@midnight-ntwrk/midnight-js-types';
import {
  fromHex,
  parseCoinPublicKeyToHex,
  parseEncPublicKeyToHex,
  toHex,
} from '@midnight-ntwrk/midnight-js-utils';

import { bytes32ToHex } from '../bytes.js';
import type { CircuitIds, NetworkId, TacitPayProviders } from '../types.js';

/**
 * The DApp Connector exchanges transactions as strings, while Midnight.js works in
 * `Transaction` objects. Both directions go through this one pair so the wire encoding
 * is stated in exactly one place.
 *
 * The encoding is **hex**, confirmed against the reference implementation in
 * midnight-js itself — `testkit-js/src/wallet/dapp-connector-wallet-adapter.ts`, the
 * receiving side of this same interface:
 *
 *   balanceUnsealedTransaction: LedgerTransaction.deserialize(…, fromHex(tx))
 *   signAndFinalize:            return { tx: toHex(finalized.serialize()) }
 *   submitTransaction:          LedgerTransaction.deserialize(…, fromHex(tx))
 *
 * `@midnight-ntwrk/dapp-connector-api` types it only as `tx: string`, so this is
 * worth stating rather than inferring.
 */
const encodeTransaction = (tx: { serialize(): Uint8Array }): string => toHex(tx.serialize());

/**
 * Markers are the runtime discriminators the ledger uses to pick a transaction shape.
 * `'signature', 'proof', 'binding'` is what the reference adapter's `submitTransaction`
 * deserializes with, so it is exactly the shape the wallet hands back from balancing —
 * signed, proven and bound. (What we send it is the unbound `'pre-binding'` shape,
 * which is what its `balanceUnsealedTransaction` expects.)
 */
const decodeFinalizedTransaction = (raw: string): FinalizedTransaction =>
  Transaction.deserialize('signature', 'proof', 'binding', new Uint8Array(fromHex(raw)));

/**
 * The subset of the connector this module needs. Narrower than `ConnectedAPI` so a
 * caller can hand over a restricted object, and so the tests can supply a fake.
 */
export type BrowserWalletApi = Pick<
  WalletConnectedAPI,
  'balanceUnsealedTransaction' | 'submitTransaction' | 'getShieldedAddresses'
> &
  // `hintUsage` lives on `HintUsage`, not `WalletConnectedAPI`; `ConnectedAPI` is both.
  Partial<Pick<ConnectedAPI, 'getProvingProvider' | 'getConfiguration' | 'hintUsage'>>;

/**
 * Fills the `walletProvider` and `midnightProvider` slots from a connected DApp Connector
 * wallet. The connector speaks serialized transactions and returns nothing from
 * `submitTransaction`, so this class is the adapter between the two shapes.
 */
export class DAppConnectorWalletProvider implements WalletProvider, MidnightProvider {
  constructor(
    private readonly api: BrowserWalletApi,
    private readonly coinPublicKey: CoinPublicKey,
    private readonly encryptionPublicKey: EncPublicKey,
  ) {}

  getCoinPublicKey(): CoinPublicKey {
    return this.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.encryptionPublicKey;
  }

  /**
   * `balanceUnsealedTransaction` is the connector method documented to accept exactly
   * `Transaction<SignatureEnabled, Proof, PreBinding>` — which is `UnboundTransaction` —
   * and to return one ready for submission, i.e. bound.
   *
   * Midnight.js offers a `ttl`, but the connector takes no such argument: the wallet owns
   * the time-to-live for the inputs it selects. The parameter is therefore not declared —
   * `WalletProvider` still matches, because a narrower implementation always does.
   */
  async balanceTx(tx: UnboundTransaction): Promise<FinalizedTransaction> {
    const balanced = await this.api.balanceUnsealedTransaction(encodeTransaction(tx));
    return decodeFinalizedTransaction(balanced.tx);
  }

  /**
   * The connector's `submitTransaction` resolves to `void`, but `MidnightProvider` must
   * return the id that `publicDataProvider.watchForTxData` then waits on.
   *
   * The id is therefore derived locally from the transaction that was submitted, the same
   * way the official wallet SDK derives it: `WalletFacade.submitTransaction` returns
   * `tx.identifiers().at(-1)`. `identifiers()` is the watchable set — `transactionHash()`
   * explicitly is not, because merging changes it.
   */
  async submitTx(tx: FinalizedTransaction): Promise<TransactionId> {
    const identifier = tx.identifiers().at(-1);
    if (identifier === undefined) {
      throw new Error('The balanced transaction carried no identifier to watch for.');
    }
    await this.api.submitTransaction(encodeTransaction(tx));
    return identifier;
  }
}

/**
 * Reads the wallet's shielded keys and converts them to the hex form Midnight.js expects.
 * The connector returns Bech32m; `parseCoinPublicKeyToHex` passes hex through unchanged,
 * so this stays correct if a wallet ever reports raw hex instead.
 */
export const createDAppConnectorWalletProvider = async (
  api: BrowserWalletApi,
  networkId: NetworkId,
): Promise<DAppConnectorWalletProvider> => {
  const addresses = await api.getShieldedAddresses();
  return new DAppConnectorWalletProvider(
    api,
    parseCoinPublicKeyToHex(addresses.shieldedCoinPublicKey, networkId),
    parseEncPublicKeyToHex(addresses.shieldedEncryptionPublicKey, networkId),
  );
};

/** Whether this connector can prove in the wallet, per PRD §8.3 tier 1 (D-010). */
export const walletCanProve = (
  api: BrowserWalletApi,
): api is BrowserWalletApi & Pick<WalletConnectedAPI, 'getProvingProvider'> =>
  typeof api.getProvingProvider === 'function';

export type ProvingTier = 'wallet' | 'local' | 'custom';

export const LOCAL_PROOF_SERVER_URL = 'http://localhost:6300';

export type ProvingSelection =
  { readonly tier: 'wallet' } | { readonly tier: 'local' | 'custom'; readonly url: string };

export type ResolvedProofProvider = {
  readonly proofProvider: ProofProvider;
  readonly tier: ProvingTier;
  /** Absent for the wallet tier, which has no endpoint. */
  readonly url?: string;
};

/**
 * Builds the proof provider for one of the three PRD §8.3 tiers.
 *
 * Tier order is a trust order, not a convenience order: proving needs the private witness,
 * so whoever proves sees the invoice. TacitPay never operates a prover — the `custom` tier
 * is a server the *user* controls (D-010).
 */
export const createProofProviderForTier = async (
  selection: ProvingSelection,
  api: BrowserWalletApi,
  zkConfigProvider: ZKConfigProvider<CircuitIds>,
): Promise<ResolvedProofProvider> => {
  if (selection.tier === 'wallet') {
    if (!walletCanProve(api)) {
      throw new Error('This wallet does not provide in-browser proving.');
    }
    return {
      proofProvider: await dappConnectorProofProvider(
        api,
        zkConfigProvider,
        CostModel.initialCostModel(),
      ),
      tier: 'wallet',
    };
  }
  return {
    proofProvider: httpClientProofProvider(selection.url, zkConfigProvider),
    tier: selection.tier,
    url: selection.url,
  };
};

export type BrowserProviderConfig = {
  readonly networkId: NetworkId;
  readonly accountId: string;
  readonly privateStoragePasswordProvider: () => string | Promise<string>;
  readonly indexerHttpUrl: string;
  readonly indexerWsUrl: string;
  readonly zkConfigBaseUrl: string;
};

export type BrowserProviderBase = Pick<
  TacitPayProviders,
  'privateStateProvider' | 'publicDataProvider' | 'zkConfigProvider'
>;

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

/**
 * The three slots that need no wallet. Kept separate so the app can read public state —
 * the `/verify/:invoiceId` page — before anyone connects a wallet.
 */
export const createBrowserProviderBase = (config: BrowserProviderConfig): BrowserProviderBase => {
  // Midnight reads this global while provider instances are constructed.
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
  };
};

export type BrowserProvidersConfig = BrowserProviderConfig & {
  readonly api: ConnectedAPI | BrowserWalletApi;
  readonly proving: ProvingSelection;
};

export type BrowserProviders = {
  readonly providers: TacitPayProviders;
  readonly provingTier: ProvingTier;
  readonly provingUrl?: string;
};

/**
 * The connector methods TacitPay calls. Hinting them up front lets the wallet gather every
 * permission in one prompt instead of interrupting mid-payment.
 */
const USED_WALLET_METHODS = [
  'getShieldedAddresses',
  'balanceUnsealedTransaction',
  'submitTransaction',
] as const satisfies ReadonlyArray<keyof WalletConnectedAPI>;

/** Builds the full six-provider object from a connected wallet. */
export const createBrowserProviders = async (
  config: BrowserProvidersConfig,
): Promise<BrowserProviders> => {
  const base = createBrowserProviderBase(config);
  const api = config.api as BrowserWalletApi;

  if (typeof api.hintUsage === 'function') {
    const methods = walletCanProve(api)
      ? [...USED_WALLET_METHODS, 'getProvingProvider' as const]
      : [...USED_WALLET_METHODS];
    // A wallet that cannot pre-authorise still works; it just prompts later.
    await api.hintUsage([...methods]).catch(() => undefined);
  }

  const walletProvider = await createDAppConnectorWalletProvider(api, config.networkId);
  const proving = await createProofProviderForTier(config.proving, api, base.zkConfigProvider);

  return {
    providers: {
      ...base,
      proofProvider: proving.proofProvider,
      walletProvider,
      midnightProvider: walletProvider,
    },
    provingTier: proving.tier,
    provingUrl: proving.url,
  };
};
