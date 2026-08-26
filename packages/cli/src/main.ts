import { parseArgs } from 'node:util';

import {
  InvoiceStatus,
  parseAmount,
  parseHexBytes32,
  toTacitPayError,
  type TacitPayApi,
  type TacitPayRole,
} from '@tacitpay/api';

import {
  deploymentFromResult,
  parseCliNetwork,
  parseToken,
  saveDeployment,
  selectedNetwork,
  type CliNetwork,
} from './config.js';
import { fundCurrentLocalWallet, seedDemoSandbox } from './local.js';
import { openDustWallet, openLiveApi } from './runtime.js';

const HELP = `TacitPay Wave 1 CLI

Usage:
  tacitpay deploy --network local|preview --token NIGHT|USDM|<64-byte-hex>
  tacitpay invoice create --amount <decimal> --memo <text> [--expires <ISO-date>]
  tacitpay invoice pay --link <url-or-fragment> [--lane shielded|unshielded]
  tacitpay invoice withdraw --id <64-byte-hex> [--lane shielded|unshielded] [--to <address>]
  tacitpay invoice cancel --id <64-byte-hex>
  tacitpay invoice status --id <64-byte-hex>
  tacitpay wallet dust-status
  tacitpay demo seed [--reset]
  tacitpay wallet fund-local

Invoice and wallet commands use TACITPAY_NETWORK=local|preview (default: preview).
Unshielded withdrawals default --to to the current wallet's unshielded address.
Wallet seeds come from TACITPAY_SEED or .env.<network> and are never printed.`;

type SettlementLane = 'shielded' | 'unshielded';

const requireOption = (value: string | undefined, option: string): string => {
  if (value === undefined || value.length === 0) throw new Error(`Missing required --${option}`);
  return value;
};

const parseLane = (value: string | undefined): SettlementLane => {
  if (value === undefined || value === 'shielded') return 'shielded';
  if (value === 'unshielded') return 'unshielded';
  throw new Error('--lane must be shielded or unshielded');
};

const parseExpiry = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined;
  const normalized = /^\d{4}-\d{2}-\d{2}$/u.test(value) ? `${value}T00:00:00.000Z` : value;
  const milliseconds = Date.parse(normalized);
  if (!Number.isFinite(milliseconds)) {
    throw new Error('--expires must be an ISO date or timestamp');
  }
  return Math.floor(milliseconds / 1_000);
};

const invoiceStatusName = (status: InvoiceStatus): string => {
  switch (status) {
    case InvoiceStatus.OPEN:
      return 'OPEN';
    case InvoiceStatus.PAID:
      return 'PAID';
    case InvoiceStatus.WITHDRAWN:
      return 'WITHDRAWN';
    case InvoiceStatus.CANCELLED:
      return 'CANCELLED';
    default:
      return `UNKNOWN(${String(status)})`;
  }
};

const withApi = async <T>(
  network: CliNetwork,
  role: TacitPayRole,
  operation: (api: TacitPayApi, walletUnshieldedAddress: string) => Promise<T>,
): Promise<T> => {
  const context = await openLiveApi({ network, role });
  try {
    return await operation(context.api, context.wallet.accountId);
  } finally {
    await context.close();
  }
};

const runDeploy = async (args: string[]): Promise<number> => {
  const { values } = parseArgs({
    args,
    options: { network: { type: 'string' }, token: { type: 'string' } },
    strict: true,
  });
  const network = parseCliNetwork(requireOption(values.network, 'network'));
  const paymentToken = parseToken(requireOption(values.token, 'token'));
  const context = await openLiveApi({ network, role: 'merchant', deployToken: paymentToken });
  try {
    const txId = context.api.deploymentTxId;
    if (txId === undefined) throw new Error('Deployment completed without a public transaction id');
    await saveDeployment(
      network,
      await deploymentFromResult({
        contractAddress: context.api.contractAddress,
        paymentToken,
        txId,
      }),
    );
    console.log(context.api.contractAddress);
    return 0;
  } finally {
    await context.close();
  }
};

const runInvoiceCreate = async (args: string[]): Promise<number> => {
  const { values } = parseArgs({
    args,
    options: {
      amount: { type: 'string' },
      memo: { type: 'string' },
      expires: { type: 'string' },
    },
    strict: true,
  });
  const amount = parseAmount(requireOption(values.amount, 'amount'));
  if (amount <= 0n) throw new Error('--amount must be positive');
  const result = await withApi(selectedNetwork(), 'merchant', (api) =>
    api.createInvoice({
      amount,
      memo: requireOption(values.memo, 'memo'),
      expiresAt: parseExpiry(values.expires),
    }),
  );
  console.log(result.link);
  return 0;
};

const runInvoicePay = async (args: string[]): Promise<number> => {
  const { values } = parseArgs({
    args,
    options: {
      link: { type: 'string' },
      lane: { type: 'string', default: 'shielded' },
    },
    strict: true,
  });
  const link = requireOption(values.link, 'link');
  const lane = parseLane(values.lane);
  const result = await withApi(selectedNetwork(), 'payer', async (api) => {
    const payload = api.decodeLink(link);
    return lane === 'unshielded' ? api.payInvoiceUnshielded(payload) : api.payInvoice(payload);
  });
  console.log(result.txId);
  return 0;
};

const parseInvoiceId = (args: string[]): string => {
  const { values } = parseArgs({
    args,
    options: { id: { type: 'string' } },
    strict: true,
  });
  return parseHexBytes32(requireOption(values.id, 'id'), 'invoice id');
};

const runInvoiceWithdraw = async (args: string[]): Promise<number> => {
  const { values } = parseArgs({
    args,
    options: {
      id: { type: 'string' },
      lane: { type: 'string', default: 'shielded' },
      to: { type: 'string' },
    },
    strict: true,
  });
  const invoiceId = parseHexBytes32(requireOption(values.id, 'id'), 'invoice id');
  const lane = parseLane(values.lane);
  const result = await withApi(selectedNetwork(), 'merchant', (api, walletUnshieldedAddress) =>
    lane === 'unshielded'
      ? api.withdrawUnshielded(invoiceId, values.to ?? walletUnshieldedAddress)
      : api.withdraw(invoiceId),
  );
  console.log(result.txId);
  return 0;
};

const runInvoiceCancel = async (args: string[]): Promise<number> => {
  const invoiceId = parseInvoiceId(args);
  const result = await withApi(selectedNetwork(), 'merchant', (api) =>
    api.cancelInvoice(invoiceId),
  );
  console.log(result.txId);
  return 0;
};

const runInvoiceStatus = async (args: string[]): Promise<number> => {
  const invoiceId = parseInvoiceId(args);
  const result = await withApi(selectedNetwork(), 'observer', (api) =>
    api.getInvoiceStatus(invoiceId),
  );
  console.log(result.exists ? invoiceStatusName(result.status) : 'UNKNOWN');
  return result.exists ? 0 : 1;
};

const runInvoice = async (args: string[]): Promise<number> => {
  const [action, ...rest] = args;
  switch (action) {
    case 'create':
      return runInvoiceCreate(rest);
    case 'pay':
      return runInvoicePay(rest);
    case 'withdraw':
      return runInvoiceWithdraw(rest);
    case 'cancel':
      return runInvoiceCancel(rest);
    case 'status':
      return runInvoiceStatus(rest);
    default:
      throw new Error(`Unknown invoice command "${action ?? ''}"`);
  }
};

const runDustStatus = async (args: string[]): Promise<number> => {
  parseArgs({ args, options: {}, strict: true });
  const wallet = await openDustWallet(selectedNetwork());
  try {
    const balance = await wallet.dustBalance();
    const detail =
      balance > 0n
        ? 'spendable'
        : 'not yet spendable; registered NIGHT may still be generating DUST';
    console.log(`DUST balance: ${balance.toString()} atomic units (${detail})`);
    return 0;
  } finally {
    await wallet.close();
  }
};

const runFundLocal = async (args: string[]): Promise<number> => {
  parseArgs({ args, options: {}, strict: true });
  const result = await fundCurrentLocalWallet();
  console.log(`Wallet: ${result.accountId}`);
  console.log(
    `NIGHT balances: ${result.balances.unshielded.toString()} unshielded, ${result.balances.shielded.toString()} shielded atomic units`,
  );
  console.log(
    `DUST: ${result.balances.dust.toString()} atomic units (${result.balances.spendableDustCoins} spendable coin(s))`,
  );
  console.log(
    result.fundingTxId === undefined
      ? 'Funding: existing NIGHT balance reused'
      : `Funding transaction: ${result.fundingTxId}`,
  );
  console.log(
    result.dustRegistrationTxId === undefined
      ? 'DUST registration: existing registration reused'
      : `DUST registration transaction: ${result.dustRegistrationTxId}`,
  );
  return 0;
};

const runWallet = async (args: string[]): Promise<number> => {
  const [action, ...rest] = args;
  if (action === 'fund-local') return runFundLocal(rest);
  if (action === 'dust-status') return runDustStatus(rest);
  throw new Error(`Unknown wallet command "${action ?? ''}"`);
};

const runDemo = async (args: string[]): Promise<number> => {
  const [action, ...rest] = args;
  if (action !== 'seed') throw new Error(`Unknown demo command "${action ?? ''}"`);
  const { values } = parseArgs({
    args: rest,
    options: { reset: { type: 'boolean', default: false } },
    strict: true,
  });
  const result = await seedDemoSandbox(values.reset);
  const { sandbox } = result;
  console.log(
    result.reused ? 'Reusing verified TacitPay judge sandbox.' : 'TacitPay judge sandbox seeded.',
  );
  console.log(`Contract: ${sandbox.contractAddress}`);
  console.log(`OPEN invoice: ${sandbox.invoices.open.invoiceId}`);
  console.log(`PAID invoice: ${sandbox.invoices.paid.invoiceId}`);
  console.log(`WITHDRAWN invoice: ${sandbox.invoices.withdrawn.invoiceId}`);
  console.log(`OPEN pay link: ${sandbox.invoices.open.link}`);
  console.log(`Sandbox metadata: ${result.sandboxPath}`);
  console.log('CLI deployment: deployments/local.json');
  return 0;
};

const connectivityMessage = (message: string): string | undefined => {
  if (message.includes('yarn env:up')) return message;
  if (!/(ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|fetch failed|WebSocket)/iu.test(message)) {
    return undefined;
  }
  return selectedNetwork() === 'local'
    ? 'Cannot reach the local Midnight network. Run yarn env:up, then retry.'
    : 'Cannot reach Midnight Preview. Check network access and config/networks.json, and ensure the local proof server is running.';
};

const formatError = (error: unknown): string => {
  const mapped = toTacitPayError(error);
  const message = connectivityMessage(mapped.message) ?? mapped.message;
  return mapped.helpUrl === undefined ? message : `${message}\n${mapped.helpUrl}`;
};

const dispatch = async (args: string[]): Promise<number> => {
  const [command, ...rest] = args;
  if (command === undefined || command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP);
    return 0;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    return 0;
  }
  switch (command) {
    case 'deploy':
      return runDeploy(rest);
    case 'invoice':
      return runInvoice(rest);
    case 'wallet':
      return runWallet(rest);
    case 'demo':
      return runDemo(rest);
    default:
      throw new Error(`Unknown command "${command}"`);
  }
};

export const main = async (args: string[] = process.argv.slice(2)): Promise<number> => {
  try {
    return await dispatch(args);
  } catch (error) {
    console.error(`tacitpay: ${formatError(error)}`);
    return 1;
  }
};
