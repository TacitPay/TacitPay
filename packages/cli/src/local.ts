import { Buffer } from 'node:buffer';
import { createHash, pbkdf2Sync } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { nativeToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import {
  createKeystore,
  HDWallet,
  Roles,
  type UnshieldedKeystore,
} from '@midnightntwrk/wallet-sdk';
import {
  InvoiceStatus,
  NIGHT_TOKEN_COLOR,
  NIGHT_TOKEN_COLOR_HEX,
  createTacitPayApi,
  parseHexBytes32,
  type TacitPayApi,
  type TacitPayProviders,
} from '@tacitpay/api';
import { createNodeProviders, createNodeWallet, type NodeWalletContext } from '@tacitpay/api/node';
import { filter, firstValueFrom, map, throwError, timeout } from 'rxjs';

import {
  deploymentFromResult,
  loadNetworkConfig,
  loadSeed,
  saveDeployment,
  type NetworkConfig,
} from './config.js';
import { requireLocalDevnet } from './runtime.js';

const LOCAL_WALLET_FUNDING = 50_000n * 1_000_000n;
const LOCAL_GENESIS_SEED = '0'.repeat(63) + '1';
const SANDBOX_PATH = fileURLToPath(
  new URL('../../../deployments/undeployed-sandbox.json', import.meta.url),
);
const SANDBOX_DISPLAY_PATH = 'deployments/undeployed-sandbox.json';
const STATUS_TIMEOUT = 5 * 60 * 1_000;
const DUST_TIMEOUT = 12 * 60 * 1_000;

type SandboxInvoice = {
  readonly invoiceId: string;
  readonly link?: string;
};

export type DemoSandbox = {
  readonly version: 1;
  readonly network: 'undeployed';
  readonly createdAt: string;
  readonly contractAddress: string;
  readonly paymentToken: string;
  readonly deploymentTxId: string;
  readonly invoices: {
    readonly open: SandboxInvoice & { readonly link: string };
    readonly paid: SandboxInvoice;
    readonly withdrawn: SandboxInvoice;
  };
};

export type DemoSeedResult = {
  readonly reused: boolean;
  readonly sandbox: DemoSandbox;
  readonly sandboxPath: string;
};

export type FundLocalResult = {
  readonly accountId: string;
  readonly fundingTxId?: string;
  readonly dustRegistrationTxId?: string;
  readonly balances: WalletBalances;
};

type WalletBalances = {
  readonly unshielded: bigint;
  readonly shielded: bigint;
  readonly dust: bigint;
  readonly spendableDustCoins: number;
};

type FundableWallet = {
  readonly context: NodeWalletContext;
  readonly signer: UnshieldedKeystore;
};

type FundingTarget = {
  readonly label: string;
  readonly wallet: FundableWallet;
  readonly unshielded: bigint;
  readonly shielded: bigint;
};

type LocalWalletFundingResult = {
  readonly fundingTxId?: string;
  readonly recipients: readonly {
    readonly label: string;
    readonly dustRegistrationTxId?: string;
    readonly balances: WalletBalances;
  }[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is invalid`);
  return value;
};

const parseSandboxInvoice = (
  value: unknown,
  label: string,
  linkRequired: boolean,
): SandboxInvoice => {
  if (!isRecord(value)) throw new Error(`${label} is invalid`);
  const invoiceId = parseHexBytes32(requireString(value.invoiceId, `${label}.invoiceId`), label);
  const link = value.link;
  if (linkRequired && (typeof link !== 'string' || !link.startsWith('/pay#'))) {
    throw new Error(`${label}.link is invalid`);
  }
  return typeof link === 'string' ? { invoiceId, link } : { invoiceId };
};

const parseSandbox = (value: unknown): DemoSandbox => {
  if (!isRecord(value) || value.version !== 1 || value.network !== 'undeployed') {
    throw new Error('sandbox metadata is invalid');
  }
  if (!isRecord(value.invoices)) throw new Error('sandbox invoices are invalid');
  const open = parseSandboxInvoice(value.invoices.open, 'sandbox.invoices.open', true);
  if (open.link === undefined) throw new Error('sandbox.invoices.open.link is missing');
  return {
    version: 1,
    network: 'undeployed',
    createdAt: requireString(value.createdAt, 'sandbox.createdAt'),
    contractAddress: parseHexBytes32(
      requireString(value.contractAddress, 'sandbox.contractAddress'),
      'sandbox.contractAddress',
    ),
    paymentToken: parseHexBytes32(
      requireString(value.paymentToken, 'sandbox.paymentToken'),
      'sandbox.paymentToken',
    ),
    deploymentTxId: requireString(value.deploymentTxId, 'sandbox.deploymentTxId'),
    invoices: {
      open: { invoiceId: open.invoiceId, link: open.link },
      paid: parseSandboxInvoice(value.invoices.paid, 'sandbox.invoices.paid', false),
      withdrawn: parseSandboxInvoice(value.invoices.withdrawn, 'sandbox.invoices.withdrawn', false),
    },
  };
};

const loadSandbox = async (): Promise<DemoSandbox | undefined> => {
  let contents: string;
  try {
    contents = await readFile(SANDBOX_PATH, 'utf8');
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return undefined;
    throw error;
  }
  try {
    return parseSandbox(JSON.parse(contents) as unknown);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${SANDBOX_DISPLAY_PATH} cannot be reused (${detail}). Run tacitpay demo seed --reset.`,
      { cause: error },
    );
  }
};

const saveSandbox = async (sandbox: DemoSandbox): Promise<void> => {
  const temporary = `${SANDBOX_PATH}.tmp`;
  await mkdir(dirname(SANDBOX_PATH), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(sandbox, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, SANDBOX_PATH);
};

const sandboxSeed = (role: 'merchant' | 'payer'): string =>
  createHash('sha256').update(`tacitpay-local-judge-sandbox:${role}`).digest('hex');

const storagePassword = (seed: string, accountId: string): string => {
  const digest = pbkdf2Sync(seed, `tacitpay:sandbox:${accountId}`, 210_000, 32, 'sha256').toString(
    'hex',
  );
  return `Tp!9${digest}`;
};

const requireUndeployedConfig = async (): Promise<NetworkConfig & { networkId: 'undeployed' }> => {
  const config = await loadNetworkConfig('local');
  if (config.networkId !== 'undeployed') {
    throw new Error('Local network configuration must use the undeployed Midnight network id');
  }
  return { ...config, networkId: 'undeployed' };
};

const walletConfig = (config: NetworkConfig & { networkId: 'undeployed' }) => ({
  networkId: config.networkId,
  nodeUrl: config.nodeUrl,
  indexerHttpUrl: config.indexerUrl,
  indexerWsUrl: config.indexerWsUrl,
  proofServerUrl: config.proofServerUrl,
});

const signerFromSeed = (seedHex: string): UnshieldedKeystore => {
  const hdResult = HDWallet.fromSeed(Uint8Array.from(Buffer.from(seedHex, 'hex')));
  if (hdResult.type !== 'seedOk') throw new Error('Local funding seed is invalid');
  const derived = hdResult.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.NightExternal] as const)
    .deriveKeysAt(0);
  hdResult.hdWallet.clear();
  if (derived.type !== 'keysDerived') throw new Error('Local funding key derivation failed');
  return createKeystore(derived.keys[Roles.NightExternal], getNetworkId());
};

const openFundableWallet = async (
  config: NetworkConfig & { networkId: 'undeployed' },
  seedHex: string,
  waitForSync = true,
): Promise<FundableWallet> => {
  const context = await createNodeWallet({ ...walletConfig(config), seedHex, waitForSync });
  const signer = signerFromSeed(seedHex);
  if (signer.getBech32Address().asString() !== context.accountId) {
    await context.close();
    throw new Error('Derived funding signer does not match the wallet account');
  }
  return { context, signer };
};

const nativeBalances = async (wallet: NodeWalletContext): Promise<WalletBalances> => {
  const state = await firstValueFrom(wallet.wallet.state());
  const token = nativeToken().raw;
  return {
    unshielded: state.unshielded.balances[token] ?? 0n,
    shielded: state.shielded.balances[token] ?? 0n,
    dust: state.dust.balance(new Date()),
    spendableDustCoins: state.dust.availableCoins.length,
  };
};

const waitForNativeBalances = async (
  wallet: NodeWalletContext,
  minimum: Pick<WalletBalances, 'unshielded' | 'shielded'>,
  timeoutMs: number,
): Promise<WalletBalances> => {
  const token = nativeToken().raw;
  return firstValueFrom(
    wallet.wallet.state().pipe(
      map((state) => ({
        unshielded: state.unshielded.balances[token] ?? 0n,
        shielded: state.shielded.balances[token] ?? 0n,
        dust: state.dust.balance(new Date()),
        spendableDustCoins: state.dust.availableCoins.length,
      })),
      filter(
        (balances) =>
          balances.unshielded >= minimum.unshielded && balances.shielded >= minimum.shielded,
      ),
      timeout({
        first: timeoutMs,
        with: () =>
          throwError(
            () =>
              new Error(
                `Wallet did not reach ${minimum.unshielded.toString()} unshielded and ${minimum.shielded.toString()} shielded NIGHT within ${timeoutMs}ms`,
              ),
          ),
      }),
    ),
  );
};

const waitForSpendableDust = async (
  wallet: NodeWalletContext,
  timeoutMs: number,
): Promise<WalletBalances> =>
  firstValueFrom(
    wallet.wallet.state().pipe(
      map((state) => ({
        unshielded: state.unshielded.balances[nativeToken().raw] ?? 0n,
        shielded: state.shielded.balances[nativeToken().raw] ?? 0n,
        dust: state.dust.balance(new Date()),
        spendableDustCoins: state.dust.availableCoins.length,
      })),
      filter((balances) => balances.dust > 0n && balances.spendableDustCoins > 0),
      timeout({
        first: timeoutMs,
        with: () =>
          throwError(() => new Error(`Wallet has no spendable DUST coin after ${timeoutMs}ms`)),
      }),
    ),
  );

const registerNightForDust = async (wallet: FundableWallet): Promise<string | undefined> => {
  const state = await wallet.context.wallet.waitForSyncedState();
  const unregistered = state.unshielded.availableCoins.filter(
    (coin) => coin.meta.registeredForDustGeneration !== true,
  );
  if (unregistered.length === 0) return undefined;
  const recipe = await wallet.context.wallet.registerNightUtxosForDustGeneration(
    unregistered,
    wallet.signer.getPublicKey(),
    (payload) => wallet.signer.signData(payload),
  );
  const finalized = await wallet.context.wallet.finalizeRecipe(recipe);
  return wallet.context.wallet.submitTransaction(finalized);
};

const transferNative = async (
  sender: FundableWallet,
  recipients: readonly Omit<FundingTarget, 'label'>[],
): Promise<string> => {
  const token = nativeToken().raw;
  const unshieldedOutputs = await Promise.all(
    recipients
      .filter((recipient) => recipient.unshielded > 0n)
      .map(async (recipient) => ({
        type: token,
        receiverAddress: await recipient.wallet.context.wallet.unshielded.getAddress(),
        amount: recipient.unshielded,
      })),
  );
  const shieldedOutputs = await Promise.all(
    recipients
      .filter((recipient) => recipient.shielded > 0n)
      .map(async (recipient) => ({
        type: token,
        receiverAddress: await recipient.wallet.context.wallet.shielded.getAddress(),
        amount: recipient.shielded,
      })),
  );
  const outputs = [
    ...(unshieldedOutputs.length === 0
      ? []
      : [{ type: 'unshielded' as const, outputs: unshieldedOutputs }]),
    ...(shieldedOutputs.length === 0
      ? []
      : [{ type: 'shielded' as const, outputs: shieldedOutputs }]),
  ];
  if (outputs.length === 0) throw new Error('At least one positive funding amount is required');

  const recipe = await sender.context.wallet.transferTransaction(
    outputs,
    {
      shieldedSecretKeys: sender.context.zswapSecretKeys,
      dustSecretKey: sender.context.dustSecretKey,
    },
    { ttl: ttlOneHour() },
  );
  const signed = await sender.context.wallet.signRecipe(recipe, (payload) =>
    sender.signer.signData(payload),
  );
  const finalized = await sender.context.wallet.finalizeRecipe(signed);
  return sender.context.wallet.submitTransaction(finalized);
};

const fundLocalWallets = async (
  config: NetworkConfig & { networkId: 'undeployed' },
  targets: readonly FundingTarget[],
  timeoutMs: number,
): Promise<LocalWalletFundingResult> => {
  const genesis = await openFundableWallet(config, LOCAL_GENESIS_SEED);
  try {
    await registerNightForDust(genesis);
    await waitForSpendableDust(genesis.context, timeoutMs);
    const before = await Promise.all(
      targets.map((target) => nativeBalances(target.wallet.context)),
    );
    const topUps = targets.map((target, index) => ({
      wallet: target.wallet,
      unshielded:
        before[index].unshielded >= target.unshielded
          ? 0n
          : target.unshielded - before[index].unshielded,
      shielded:
        before[index].shielded >= target.shielded ? 0n : target.shielded - before[index].shielded,
    }));
    const needsFunding = topUps.some((topUp) => topUp.unshielded > 0n || topUp.shielded > 0n);
    const fundingTxId = needsFunding ? await transferNative(genesis, topUps) : undefined;
    await Promise.all(
      targets.map((target) =>
        waitForNativeBalances(
          target.wallet.context,
          { unshielded: target.unshielded, shielded: target.shielded },
          timeoutMs,
        ),
      ),
    );

    const dustRegistrationTxIds: Array<string | undefined> = [];
    for (const target of targets) {
      dustRegistrationTxIds.push(await registerNightForDust(target.wallet));
    }
    const balances = await Promise.all(
      targets.map((target) => waitForSpendableDust(target.wallet.context, timeoutMs)),
    );
    return {
      fundingTxId,
      recipients: targets.map((target, index) => ({
        label: target.label,
        dustRegistrationTxId: dustRegistrationTxIds[index],
        balances: balances[index],
      })),
    };
  } finally {
    await genesis.context.close();
  }
};

const providersFor = (
  config: NetworkConfig & { networkId: 'undeployed' },
  wallet: NodeWalletContext,
  seed: string,
): TacitPayProviders =>
  createNodeProviders({
    networkId: config.networkId,
    accountId: wallet.accountId,
    privateStoragePasswordProvider: () => storagePassword(seed, wallet.accountId),
    indexerHttpUrl: config.indexerUrl,
    indexerWsUrl: config.indexerWsUrl,
    proofServerUrl: config.proofServerUrl,
    walletContext: wallet,
  });

const waitForStatus = async (
  api: TacitPayApi,
  invoiceId: string,
  expected: InvoiceStatus,
): Promise<void> => {
  const deadline = Date.now() + STATUS_TIMEOUT;
  let lastStatus: InvoiceStatus | undefined;
  while (Date.now() < deadline) {
    const state = await api.getInvoiceStatus(invoiceId);
    if (state.exists) lastStatus = state.status;
    if (state.exists && state.status === expected) return;
    // The indexer trails accepted transactions, so poll until the exact state is visible.
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(
    `Invoice ${invoiceId} did not reach ${InvoiceStatus[expected]} within ${STATUS_TIMEOUT}ms (last status: ${lastStatus === undefined ? 'missing' : InvoiceStatus[lastStatus]})`,
  );
};

const validateSandbox = async (
  config: NetworkConfig & { networkId: 'undeployed' },
  sandbox: DemoSandbox,
): Promise<void> => {
  const seed = sandboxSeed('merchant');
  const privateStateRoot = await mkdtemp(join(tmpdir(), 'tacitpay-sandbox-check-'));
  const originalWorkingDirectory = process.cwd();
  let wallet: FundableWallet | undefined;
  try {
    process.chdir(privateStateRoot);
    wallet = await openFundableWallet(config, seed, false);
    const api = await createTacitPayApi({
      providers: providersFor(config, wallet.context, seed),
      contractAddress: sandbox.contractAddress,
      role: 'observer',
      paymentToken: NIGHT_TOKEN_COLOR,
    });
    const states = await Promise.all([
      api.getInvoiceStatus(sandbox.invoices.open.invoiceId),
      api.getInvoiceStatus(sandbox.invoices.paid.invoiceId),
      api.getInvoiceStatus(sandbox.invoices.withdrawn.invoiceId),
    ]);
    const expected = [InvoiceStatus.OPEN, InvoiceStatus.PAID, InvoiceStatus.WITHDRAWN];
    if (states.some((state, index) => !state.exists || state.status !== expected[index])) {
      throw new Error('saved invoice states do not match the running local chain');
    }
  } finally {
    await wallet?.context.close();
    process.chdir(originalWorkingDirectory);
    await rm(privateStateRoot, { recursive: true, force: true });
  }
};

const seedFreshSandbox = async (
  config: NetworkConfig & { networkId: 'undeployed' },
): Promise<DemoSandbox> => {
  const merchantSeed = sandboxSeed('merchant');
  const payerSeed = sandboxSeed('payer');
  const privateStateRoot = await mkdtemp(join(tmpdir(), 'tacitpay-sandbox-'));
  const originalWorkingDirectory = process.cwd();
  let merchantWallet: FundableWallet | undefined;
  let payerWallet: FundableWallet | undefined;

  try {
    process.chdir(privateStateRoot);
    console.log('Opening deterministic merchant and payer wallets (seeds remain hidden)...');
    merchantWallet = await openFundableWallet(config, merchantSeed);
    payerWallet = await openFundableWallet(config, payerSeed);

    console.log('Funding both wallets and registering NIGHT for DUST generation...');
    console.log('Waiting for spendable DUST can take about five minutes on a fresh local chain.');
    const funding = await fundLocalWallets(
      config,
      [
        {
          label: 'merchant',
          wallet: merchantWallet,
          unshielded: LOCAL_WALLET_FUNDING,
          shielded: 0n,
        },
        {
          label: 'payer',
          wallet: payerWallet,
          unshielded: LOCAL_WALLET_FUNDING,
          shielded: LOCAL_WALLET_FUNDING,
        },
      ],
      DUST_TIMEOUT,
    );
    for (const recipient of funding.recipients) {
      console.log(
        `${recipient.label}: ${recipient.balances.dust.toString()} DUST atomic units, ${recipient.balances.spendableDustCoins} spendable coin(s)`,
      );
    }

    const merchantApi = await createTacitPayApi({
      providers: providersFor(config, merchantWallet.context, merchantSeed),
      role: 'merchant',
      paymentToken: NIGHT_TOKEN_COLOR,
    });
    if (merchantApi.deploymentTxId === undefined) {
      throw new Error('Sandbox deployment completed without a transaction id');
    }
    console.log(`Contract deployed: ${merchantApi.contractAddress}`);
    await saveDeployment(
      'local',
      await deploymentFromResult({
        contractAddress: merchantApi.contractAddress,
        paymentToken: NIGHT_TOKEN_COLOR,
        txId: merchantApi.deploymentTxId,
      }),
    );

    console.log('Creating OPEN, PAID, and WITHDRAWN sample invoices...');
    const open = await merchantApi.createInvoice({ amount: 1_250_000n, memo: 'Judge demo OPEN' });
    const paid = await merchantApi.createInvoice({ amount: 2_500_000n, memo: 'Judge demo PAID' });
    const withdrawn = await merchantApi.createInvoice({
      amount: 3_750_000n,
      memo: 'Judge demo WITHDRAWN',
    });
    await Promise.all([
      waitForStatus(merchantApi, open.invoiceId, InvoiceStatus.OPEN),
      waitForStatus(merchantApi, paid.invoiceId, InvoiceStatus.OPEN),
      waitForStatus(merchantApi, withdrawn.invoiceId, InvoiceStatus.OPEN),
    ]);

    const payerApi = await createTacitPayApi({
      providers: providersFor(config, payerWallet.context, payerSeed),
      contractAddress: merchantApi.contractAddress,
      role: 'payer',
      paymentToken: NIGHT_TOKEN_COLOR,
    });
    await payerApi.payInvoice(payerApi.decodeLink(`/pay${paid.link}`));
    await waitForStatus(payerApi, paid.invoiceId, InvoiceStatus.PAID);
    await payerApi.payInvoice(payerApi.decodeLink(`/pay${withdrawn.link}`));
    await waitForStatus(payerApi, withdrawn.invoiceId, InvoiceStatus.PAID);
    await merchantApi.withdraw(withdrawn.invoiceId);
    await waitForStatus(merchantApi, withdrawn.invoiceId, InvoiceStatus.WITHDRAWN);

    const sandbox: DemoSandbox = {
      version: 1,
      network: 'undeployed',
      createdAt: new Date().toISOString(),
      contractAddress: merchantApi.contractAddress,
      paymentToken: NIGHT_TOKEN_COLOR_HEX,
      deploymentTxId: merchantApi.deploymentTxId,
      invoices: {
        open: { invoiceId: open.invoiceId, link: `/pay${open.link}` },
        paid: { invoiceId: paid.invoiceId },
        withdrawn: { invoiceId: withdrawn.invoiceId },
      },
    };
    await saveSandbox(sandbox);
    return sandbox;
  } finally {
    await Promise.allSettled([merchantWallet?.context.close(), payerWallet?.context.close()]);
    process.chdir(originalWorkingDirectory);
    await rm(privateStateRoot, { recursive: true, force: true });
  }
};

export const seedDemoSandbox = async (reset: boolean): Promise<DemoSeedResult> => {
  await requireLocalDevnet();
  const config = await requireUndeployedConfig();
  const existing = reset ? undefined : await loadSandbox();
  if (existing !== undefined) {
    try {
      await validateSandbox(config, existing);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${SANDBOX_DISPLAY_PATH} is stale (${detail}). Run tacitpay demo seed --reset.`,
        { cause: error },
      );
    }
    return { reused: true, sandbox: existing, sandboxPath: SANDBOX_DISPLAY_PATH };
  }

  const sandbox = await seedFreshSandbox(config);
  return { reused: false, sandbox, sandboxPath: SANDBOX_DISPLAY_PATH };
};

export const fundCurrentLocalWallet = async (): Promise<FundLocalResult> => {
  await requireLocalDevnet();
  const config = await requireUndeployedConfig();
  const seed = await loadSeed('local');
  const wallet = await openFundableWallet(config, seed);
  try {
    const result: LocalWalletFundingResult = await fundLocalWallets(
      config,
      [
        {
          label: 'wallet',
          wallet,
          unshielded: LOCAL_WALLET_FUNDING,
          shielded: LOCAL_WALLET_FUNDING,
        },
      ],
      DUST_TIMEOUT,
    );
    const funded = result.recipients[0];
    if (funded === undefined) throw new Error('Local wallet funding returned no recipient');
    return {
      accountId: wallet.context.accountId,
      fundingTxId: result.fundingTxId,
      dustRegistrationTxId: funded.dustRegistrationTxId,
      balances: funded.balances,
    };
  } finally {
    await wallet.context.close();
  }
};
