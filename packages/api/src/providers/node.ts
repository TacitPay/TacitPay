import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';

import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import {
  type CoinPublicKey,
  DustSecretKey,
  type EncPublicKey,
  type FinalizedTransaction,
  LedgerParameters,
  ZswapSecretKeys,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  MidnightProvider,
  UnboundTransaction,
  WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import {
  createKeystore,
  DustWallet,
  HDWallet,
  NoOpTransactionHistoryStorage,
  PublicKey,
  Roles,
  ShieldedWallet,
  UnshieldedWallet,
  WalletFacade,
} from '@midnightntwrk/wallet-sdk';
import { firstValueFrom } from 'rxjs';
import { WebSocket } from 'ws';

import type { CircuitIds, NetworkId, TacitPayProviders } from '../types.js';

const DEFAULT_MANAGED_DIR = fileURLToPath(
  new URL('../../../../contracts/managed/tacitpay', import.meta.url),
);
const DEFAULT_PROOF_SERVER = 'http://127.0.0.1:6300';

export type NodeWalletConfig = {
  readonly networkId: NetworkId;
  readonly seedHex: string;
  readonly nodeUrl: string;
  readonly indexerHttpUrl: string;
  readonly indexerWsUrl: string;
  readonly proofServerUrl?: string;
  readonly waitForSync?: boolean;
};

export type NodeWalletContext = {
  readonly wallet: WalletFacade;
  readonly zswapSecretKeys: ZswapSecretKeys;
  readonly dustSecretKey: DustSecretKey;
  readonly accountId: string;
  dustBalance(): Promise<bigint>;
  close(): Promise<void>;
};

const installNodeWebSocket = (): void => {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
};

const requireSeed = (seedHex: string): Uint8Array => {
  if (!/^[0-9a-f]{64}$/i.test(seedHex)) {
    throw new TypeError('TACITPAY_SEED must be exactly 32 bytes of hexadecimal');
  }
  return Uint8Array.from(Buffer.from(seedHex, 'hex'));
};

const relayUrl = (nodeUrl: string): URL => {
  const url = new URL(nodeUrl);
  if (url.protocol === 'http:') url.protocol = 'ws:';
  if (url.protocol === 'https:') url.protocol = 'wss:';
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new TypeError('nodeUrl must use http(s) or ws(s)');
  }
  return url;
};

export const createNodeWallet = async (config: NodeWalletConfig): Promise<NodeWalletContext> => {
  // Midnight reads this global while wallet/provider instances are constructed.
  setNetworkId(config.networkId);
  installNodeWebSocket();

  const hdResult = HDWallet.fromSeed(requireSeed(config.seedHex));
  if (hdResult.type !== 'seedOk') throw new Error('TACITPAY_SEED is not a valid wallet seed');
  const derived = hdResult.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust] as const)
    .deriveKeysAt(0);
  hdResult.hdWallet.clear();
  if (derived.type !== 'keysDerived') throw new Error('Wallet key derivation failed');

  const zswapSecretKeys = ZswapSecretKeys.fromSeed(derived.keys[Roles.Zswap]);
  const dustSecretKey = DustSecretKey.fromSeed(derived.keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(derived.keys[Roles.NightExternal], getNetworkId());
  const txHistoryStorage = new NoOpTransactionHistoryStorage();
  const indexerClientConnection = {
    indexerHttpUrl: config.indexerHttpUrl,
    indexerWsUrl: config.indexerWsUrl,
  };
  const walletConfig = {
    networkId: getNetworkId(),
    indexerClientConnection,
    provingServerUrl: new URL(config.proofServerUrl ?? DEFAULT_PROOF_SERVER),
    relayURL: relayUrl(config.nodeUrl),
    txHistoryStorage,
    costParameters: { feeBlocksMargin: 5, additionalFeeOverhead: 300_000_000_000_000n },
  };
  const wallet = await WalletFacade.init({
    configuration: walletConfig,
    shielded: (walletConfiguration) =>
      ShieldedWallet(walletConfiguration).startWithSecretKeys(zswapSecretKeys),
    unshielded: (walletConfiguration) =>
      UnshieldedWallet(walletConfiguration).startWithPublicKey(
        PublicKey.fromKeyStore(unshieldedKeystore),
      ),
    dust: (walletConfiguration) =>
      DustWallet(walletConfiguration).startWithSecretKey(
        dustSecretKey,
        LedgerParameters.initialParameters().dust,
      ),
  });
  await wallet.start(zswapSecretKeys, dustSecretKey);
  if (config.waitForSync ?? true) await wallet.waitForSyncedState();

  return {
    wallet,
    zswapSecretKeys,
    dustSecretKey,
    accountId: unshieldedKeystore.getBech32Address().asString(),
    async dustBalance(): Promise<bigint> {
      const state = await firstValueFrom(wallet.state());
      return state.dust.balance(new Date());
    },
    async close(): Promise<void> {
      await wallet.stop();
    },
  };
};

/** The official WalletFacade adapter fills both Midnight provider slots. */
export class WalletAndMidnightProvider implements WalletProvider, MidnightProvider {
  constructor(private readonly context: NodeWalletContext) {}

  getCoinPublicKey(): CoinPublicKey {
    return this.context.zswapSecretKeys.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.context.zswapSecretKeys.encryptionPublicKey;
  }

  async balanceTx(
    transaction: UnboundTransaction,
    ttl: Date = ttlOneHour(),
  ): Promise<FinalizedTransaction> {
    const recipe = await this.context.wallet.balanceUnboundTransaction(
      transaction,
      {
        shieldedSecretKeys: this.context.zswapSecretKeys,
        dustSecretKey: this.context.dustSecretKey,
      },
      { ttl },
    );
    return this.context.wallet.finalizeRecipe(recipe);
  }

  submitTx(transaction: FinalizedTransaction): Promise<string> {
    return this.context.wallet.submitTransaction(transaction);
  }
}

export type NodeProviderConfig = {
  readonly networkId: NetworkId;
  readonly accountId: string;
  readonly privateStoragePasswordProvider: () => string | Promise<string>;
  readonly indexerHttpUrl: string;
  readonly indexerWsUrl: string;
  readonly walletContext: NodeWalletContext;
  readonly proofServerUrl?: string;
  readonly managedDir?: string;
};

export const createNodeProviders = (config: NodeProviderConfig): TacitPayProviders => {
  // This call and the WebSocket polyfill must precede every provider constructor.
  setNetworkId(config.networkId);
  installNodeWebSocket();

  const zkConfigProvider = new NodeZkConfigProvider<CircuitIds>(
    config.managedDir ?? DEFAULT_MANAGED_DIR,
  );
  const walletProvider = new WalletAndMidnightProvider(config.walletContext);
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'tacitpay-private-state',
      signingKeyStoreName: 'tacitpay-signing-keys',
      privateStoragePasswordProvider: config.privateStoragePasswordProvider,
      accountId: config.accountId,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexerHttpUrl, config.indexerWsUrl),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(
      config.proofServerUrl ?? DEFAULT_PROOF_SERVER,
      zkConfigProvider,
    ),
    walletProvider,
    midnightProvider: walletProvider,
  };
};
