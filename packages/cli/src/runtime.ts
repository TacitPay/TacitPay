import { pbkdf2Sync } from 'node:crypto';

import {
  bytes32FromHex,
  createTacitPayApi,
  type TacitPayApi,
  type TacitPayRole,
} from '@tacitpay/api';
import { createNodeProviders, createNodeWallet, type NodeWalletContext } from '@tacitpay/api/node';

import {
  MANAGED_DIR,
  loadDeployment,
  loadNetworkConfig,
  loadSeed,
  type CliNetwork,
} from './config.js';

export type LiveApiContext = {
  readonly api: TacitPayApi;
  readonly wallet: NodeWalletContext;
  close(): Promise<void>;
};

const storagePassword = (seed: string, accountId: string): string => {
  const digest = pbkdf2Sync(seed, `tacitpay:${accountId}`, 210_000, 32, 'sha256').toString('hex');
  // The prefix satisfies the provider's uppercase/lowercase/digit/symbol policy.
  return `Tp!9${digest}`;
};

const requireReachable = async (label: string, url: string, init?: RequestInit): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'connection failed';
    throw new Error(`Cannot reach ${label} at ${url}: ${detail}`, { cause: error });
  }
  if (!response.ok) {
    throw new Error(`${label} at ${url} is unavailable (HTTP ${response.status})`);
  }
};

const checkLiveServices = async (
  config: Awaited<ReturnType<typeof loadNetworkConfig>>,
  requireProof: boolean,
): Promise<void> => {
  const checks: Promise<void>[] = [
    requireReachable('Midnight indexer', config.indexerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query TacitPayHealth { __typename }' }),
    }),
  ];
  if (config.networkId === 'undeployed') {
    const nodeHealthUrl = new URL(config.nodeUrl);
    nodeHealthUrl.protocol = nodeHealthUrl.protocol === 'wss:' ? 'https:' : 'http:';
    nodeHealthUrl.pathname = '/health';
    checks.push(requireReachable('Midnight node', nodeHealthUrl.href));
  }
  if (requireProof) {
    checks.push(requireReachable('proof server', new URL('/', config.proofServerUrl).href));
  }
  await Promise.all(checks);
};

export const requireLocalDevnet = async (): Promise<void> => {
  const config = await loadNetworkConfig('local');
  try {
    await checkLiveServices(config, true);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Local Midnight devnet is not reachable. Run yarn env:up, then retry. ${detail}`,
      {
        cause: error,
      },
    );
  }
};

const openWallet = async (
  network: CliNetwork,
  requireProof: boolean,
): Promise<{
  readonly wallet: NodeWalletContext;
  readonly seed: string;
  readonly config: Awaited<ReturnType<typeof loadNetworkConfig>>;
}> => {
  const config = await loadNetworkConfig(network);
  await checkLiveServices(config, requireProof);
  const seed = await loadSeed(network);
  const wallet = await createNodeWallet({
    networkId: config.networkId,
    seedHex: seed,
    nodeUrl: config.nodeUrl,
    indexerHttpUrl: config.indexerUrl,
    indexerWsUrl: config.indexerWsUrl,
    proofServerUrl: config.proofServerUrl,
    waitForSync: true,
  });
  return { wallet, seed, config };
};

export const openLiveApi = async (input: {
  readonly network: CliNetwork;
  readonly role: TacitPayRole;
  readonly deployToken?: Uint8Array;
}): Promise<LiveApiContext> => {
  const opened = await openWallet(input.network, input.role !== 'observer');
  try {
    const deployment =
      input.deployToken === undefined ? await loadDeployment(input.network) : undefined;
    const paymentToken =
      input.deployToken ?? bytes32FromHex(deployment?.paymentToken ?? '', 'paymentToken');
    const providers = createNodeProviders({
      networkId: opened.config.networkId,
      accountId: opened.wallet.accountId,
      privateStoragePasswordProvider: () => storagePassword(opened.seed, opened.wallet.accountId),
      indexerHttpUrl: opened.config.indexerUrl,
      indexerWsUrl: opened.config.indexerWsUrl,
      proofServerUrl: opened.config.proofServerUrl,
      managedDir: MANAGED_DIR,
      walletContext: opened.wallet,
    });
    const api = await createTacitPayApi({
      providers,
      contractAddress: deployment?.contractAddress,
      role: input.role,
      paymentToken,
    });
    return {
      api,
      wallet: opened.wallet,
      close: () => opened.wallet.close(),
    };
  } catch (error) {
    await opened.wallet.close();
    throw error;
  }
};

export const openDustWallet = async (network: CliNetwork): Promise<NodeWalletContext> => {
  const opened = await openWallet(network, false);
  return opened.wallet;
};
