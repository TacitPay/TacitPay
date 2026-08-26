import {
  deployContract,
  findDeployedContract,
  type FoundContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  Contract,
  InvoiceStatus,
  ledger,
  type Witnesses as GeneratedWitnesses,
} from '@tacitpay/contracts/managed/tacitpay/contract';
import type { Observable } from 'rxjs';

import {
  bytes32FromHex,
  bytes32ToHex,
  equalBytes,
  linkTokenToHex,
  parseHexBytes32,
  randomBytes32,
  tokenColorToLinkToken,
} from './bytes.js';
import { MAX_UINT64 } from './constants.js';
import { memoHash } from './crypto.js';
import { toTacitPayError } from './errors.js';
import { decodeLink, encodeLink } from './link.js';
import { observeInvoiceStatus, queryPublicLedger, readInvoiceStatus } from './observer.js';
import {
  createMerchantPrivateState,
  createPayerPrivateState,
  isMerchantPrivateState,
  isPayerPrivateState,
} from './state.js';
import type {
  CreateTacitPayApiOptions,
  InvoiceLinkPayload,
  InvoiceStatusName,
  InvoiceView,
  MerchantPrivateState,
  NetworkId,
  PayerPrivateState,
  ReceiptView,
  TacitPayApi,
  TacitPayPrivateState,
  TacitPayPrivateStateId,
  TacitPayProviders,
  TacitPayRole,
} from './types.js';

type BoundContract = Contract<TacitPayPrivateState, GeneratedWitnesses<TacitPayPrivateState>>;
type ConnectedContract = FoundContract<BoundContract>;

const PRIVATE_STATE_IDS = {
  merchant: 'tacitpay-merchant',
  payer: 'tacitpay-payer',
  observer: 'tacitpay-payer',
} as const satisfies Record<TacitPayRole, TacitPayPrivateStateId>;

const requireSecretKey = (secretKey: Uint8Array, witness: string): Uint8Array => {
  if (!(secretKey instanceof Uint8Array) || secretKey.length !== 32) {
    throw new Error(`${witness}: private state must carry a 32-byte secret key`);
  }
  return secretKey;
};

/** Role-specific adapters keep the PRD §7 state shapes intact for generated witnesses. */
const apiWitnesses: GeneratedWitnesses<TacitPayPrivateState> = {
  merchantSecret: ({ privateState }) => {
    if (!isMerchantPrivateState(privateState)) {
      throw new Error('merchantSecret requires tacitpay-merchant private state');
    }
    return [privateState, requireSecretKey(privateState.secretKey, 'merchantSecret')];
  },
  payerSecret: ({ privateState }) => {
    if (!isPayerPrivateState(privateState)) {
      throw new Error('payerSecret requires tacitpay-payer private state');
    }
    return [privateState, requireSecretKey(privateState.secretKey, 'payerSecret')];
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const compiledAssetsPath = (providers: TacitPayProviders): string => {
  const zkConfigProvider: unknown = providers.zkConfigProvider;
  if (isRecord(zkConfigProvider) && typeof zkConfigProvider.directory === 'string') {
    return zkConfigProvider.directory;
  }
  if (isRecord(zkConfigProvider) && typeof zkConfigProvider.baseURL === 'string') {
    return zkConfigProvider.baseURL;
  }
  throw new Error('TacitPay ZK config provider must expose its managed assets path');
};

const makeCompiledContract = (providers: TacitPayProviders) => {
  const compiled = CompiledContract.make<BoundContract, TacitPayPrivateState>('tacitpay', Contract);
  const withWitnesses = CompiledContract.withWitnesses(compiled, apiWitnesses);
  return CompiledContract.withCompiledFileAssets(withWitnesses, compiledAssetsPath(providers));
};

const privateStateForRole = (role: TacitPayRole): TacitPayPrivateState =>
  role === 'merchant' ? createMerchantPrivateState() : createPayerPrivateState();

const requireNetworkId = (): NetworkId => {
  const network = getNetworkId();
  if (!['undeployed', 'preview', 'preprod', 'mainnet'].includes(network)) {
    throw new Error(`Unsupported Midnight network id "${network}"`);
  }
  return network as NetworkId;
};

const statusName = (status: InvoiceStatus): InvoiceStatusName => {
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
      throw new Error(`Unknown invoice status ${String(status)}`);
  }
};

const statusFromName = (status: InvoiceStatusName): InvoiceStatus => {
  switch (status) {
    case 'OPEN':
      return InvoiceStatus.OPEN;
    case 'PAID':
      return InvoiceStatus.PAID;
    case 'WITHDRAWN':
      return InvoiceStatus.WITHDRAWN;
    case 'CANCELLED':
      return InvoiceStatus.CANCELLED;
  }
};

const unixSeconds = (): number => Math.floor(Date.now() / 1_000);

const expiryAsNumber = (value: bigint): number => {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('On-chain invoice expiry exceeds JavaScript safe integer range');
  }
  return Number(value);
};

const validateCreateInput = (amount: bigint, memo: string, expiresAt: number): void => {
  if (typeof amount !== 'bigint' || amount <= 0n || amount > MAX_UINT64) {
    throw new RangeError('Amount must be positive and fit Uint<64>');
  }
  if (typeof memo !== 'string') throw new TypeError('memo must be a string');
  if (!Number.isSafeInteger(expiresAt) || expiresAt < 0) {
    throw new RangeError('expiresAt must be a non-negative unix-second integer');
  }
};

const connectContract = async (
  options: CreateTacitPayApiOptions,
): Promise<{
  readonly contract: ConnectedContract;
  readonly address: string;
  readonly deploymentTxId?: string;
}> => {
  const compiledContract = makeCompiledContract(options.providers);
  const privateStateId = PRIVATE_STATE_IDS[options.role];

  if (options.contractAddress === undefined) {
    if (options.role !== 'merchant') {
      throw new Error('Only a merchant API instance can deploy TacitPay');
    }
    const deployed = await deployContract(options.providers, {
      compiledContract,
      privateStateId,
      initialPrivateState: createMerchantPrivateState(),
      args: [Uint8Array.from(options.paymentToken)],
    });
    return {
      contract: deployed,
      address: deployed.deployTxData.public.contractAddress,
      deploymentTxId: deployed.deployTxData.public.txId,
    };
  }

  const address = parseHexBytes32(options.contractAddress, 'contractAddress');
  options.providers.privateStateProvider.setContractAddress(address);
  const storedState = await options.providers.privateStateProvider.get(privateStateId);
  const initialPrivateState = storedState ?? privateStateForRole(options.role);
  const found = await findDeployedContract(options.providers, {
    compiledContract,
    contractAddress: address,
    privateStateId,
    initialPrivateState,
  });
  return { contract: found, address };
};

class TacitPayApiImplementation implements TacitPayApi {
  readonly paymentToken: Uint8Array;
  readonly network: NetworkId;

  constructor(
    readonly contractAddress: string,
    readonly role: TacitPayRole,
    readonly deploymentTxId: string | undefined,
    private readonly providers: TacitPayProviders,
    private readonly contract: ConnectedContract,
    paymentToken: Uint8Array,
  ) {
    this.paymentToken = Uint8Array.from(paymentToken);
    this.network = requireNetworkId();
  }

  private requireRole(role: 'merchant' | 'payer'): void {
    if (this.role !== role) throw new Error(`This operation requires the ${role} role`);
  }

  private queryLedger() {
    return queryPublicLedger(this.providers, this.contractAddress);
  }

  private async merchantState(): Promise<MerchantPrivateState> {
    const state = await this.providers.privateStateProvider.get('tacitpay-merchant');
    if (state === null || !isMerchantPrivateState(state)) {
      throw new Error('Merchant private state is unavailable');
    }
    return state;
  }

  private async payerState(): Promise<PayerPrivateState> {
    const state = await this.providers.privateStateProvider.get('tacitpay-payer');
    if (state === null || !isPayerPrivateState(state)) {
      throw new Error('Payer private state is unavailable');
    }
    return state;
  }

  async createInvoice(input: {
    readonly amount: bigint;
    readonly memo: string;
    readonly expiresAt?: number;
  }): Promise<{ readonly invoiceId: string; readonly link: string; readonly txId: string }> {
    this.requireRole('merchant');
    const expiresAt = input.expiresAt ?? 0;
    validateCreateInput(input.amount, input.memo, expiresAt);

    const invoiceIdBytes = randomBytes32();
    const saltBytes = randomBytes32();
    const memoHashBytes = await memoHash(input.memo);
    const invoiceId = bytes32ToHex(invoiceIdBytes, 'invoiceId');
    const salt = bytes32ToHex(saltBytes, 'salt');
    const memoHashHex = bytes32ToHex(memoHashBytes, 'memoHash');
    const state = await this.merchantState();
    const draft = {
      amount: input.amount,
      memo: input.memo,
      memoHash: memoHashHex,
      salt,
      expiresAt,
      createdAt: unixSeconds(),
      status: 'OPEN' as const,
      txIds: {},
    };
    await this.providers.privateStateProvider.set('tacitpay-merchant', {
      ...state,
      invoices: { ...state.invoices, [invoiceId]: draft },
    });

    try {
      const call = await this.contract.callTx.createInvoice(
        invoiceIdBytes,
        input.amount,
        memoHashBytes,
        saltBytes,
        BigInt(expiresAt),
      );
      const txId = call.public.txId;
      await this.providers.privateStateProvider.set('tacitpay-merchant', {
        ...state,
        invoices: {
          ...state.invoices,
          [invoiceId]: { ...draft, txIds: { created: txId } },
        },
      });
      const payload: InvoiceLinkPayload = {
        v: 1,
        net: this.network,
        contract: this.contractAddress,
        id: invoiceId,
        amount: input.amount.toString(),
        token: tokenColorToLinkToken(this.paymentToken),
        memo: input.memo,
        salt,
        exp: expiresAt,
      };
      return { invoiceId, link: encodeLink(payload), txId };
    } catch (error) {
      const invoices = { ...state.invoices };
      delete invoices[invoiceId];
      await this.providers.privateStateProvider.set('tacitpay-merchant', { ...state, invoices });
      throw toTacitPayError(error);
    }
  }

  async withdraw(invoiceId: string): Promise<{ readonly txId: string }> {
    this.requireRole('merchant');
    const id = parseHexBytes32(invoiceId, 'invoiceId');
    try {
      const call = await this.contract.callTx.withdraw(bytes32FromHex(id, 'invoiceId'));
      const txId = call.public.txId;
      const state = await this.merchantState();
      const record = state.invoices[id];
      if (record !== undefined) {
        await this.providers.privateStateProvider.set('tacitpay-merchant', {
          ...state,
          invoices: {
            ...state.invoices,
            [id]: {
              ...record,
              status: 'WITHDRAWN',
              txIds: { ...record.txIds, withdrawn: txId },
            },
          },
        });
      }
      return { txId };
    } catch (error) {
      throw toTacitPayError(error);
    }
  }

  async cancelInvoice(invoiceId: string): Promise<{ readonly txId: string }> {
    this.requireRole('merchant');
    const id = parseHexBytes32(invoiceId, 'invoiceId');
    try {
      const call = await this.contract.callTx.cancelInvoice(bytes32FromHex(id, 'invoiceId'));
      const txId = call.public.txId;
      const state = await this.merchantState();
      const record = state.invoices[id];
      if (record !== undefined) {
        await this.providers.privateStateProvider.set('tacitpay-merchant', {
          ...state,
          invoices: {
            ...state.invoices,
            [id]: {
              ...record,
              status: 'CANCELLED',
              txIds: { ...record.txIds, cancelled: txId },
            },
          },
        });
      }
      return { txId };
    } catch (error) {
      throw toTacitPayError(error);
    }
  }

  async listMyInvoices(): Promise<InvoiceView[]> {
    this.requireRole('merchant');
    const state = await this.merchantState();
    const publicLedger = await this.queryLedger();
    const invoices = { ...state.invoices };
    const views = Object.entries(state.invoices).map(([invoiceId, record]) => {
      const id = bytes32FromHex(invoiceId, 'invoiceId');
      const exists = publicLedger.invoices.member(id);
      const onChainStatus = exists
        ? publicLedger.invoices.lookup(id).status
        : statusFromName(record.status);
      const updatedRecord = { ...record, status: statusName(onChainStatus) };
      invoices[invoiceId] = updatedRecord;
      return { ...updatedRecord, invoiceId, exists, onChainStatus };
    });
    await this.providers.privateStateProvider.set('tacitpay-merchant', { ...state, invoices });
    return views;
  }

  decodeLink(link: string): InvoiceLinkPayload {
    return decodeLink(link, {
      network: this.network,
      contractAddress: this.contractAddress,
      paymentToken: this.paymentToken,
    });
  }

  async payInvoice(payload: InvoiceLinkPayload): Promise<{ readonly txId: string }> {
    this.requireRole('payer');
    const validated = this.decodeLink(encodeLink(payload));
    const amount = BigInt(validated.amount);
    const memoHashBytes = await memoHash(validated.memo);
    const token = bytes32FromHex(linkTokenToHex(validated.token), 'token');
    try {
      const call = await this.contract.callTx.payInvoice(
        bytes32FromHex(validated.id, 'invoiceId'),
        amount,
        memoHashBytes,
        bytes32FromHex(validated.salt, 'salt'),
        { nonce: randomBytes32(), color: token, value: amount },
      );
      const txId = call.public.txId;
      const state = await this.payerState();
      await this.providers.privateStateProvider.set('tacitpay-payer', {
        ...state,
        receipts: {
          ...state.receipts,
          [validated.id]: {
            contractAddress: this.contractAddress,
            amount,
            memoHash: bytes32ToHex(memoHashBytes, 'memoHash'),
            salt: validated.salt,
            memo: validated.memo,
            paidAt: unixSeconds(),
            txId,
          },
        },
      });
      return { txId };
    } catch (error) {
      throw toTacitPayError(error);
    }
  }

  async listMyReceipts(): Promise<ReceiptView[]> {
    this.requireRole('payer');
    const state = await this.payerState();
    const publicLedger = await this.queryLedger();
    return Object.entries(state.receipts).map(([invoiceId, receipt]) => {
      const id = bytes32FromHex(invoiceId, 'invoiceId');
      const exists = publicLedger.invoices.member(id);
      const record = exists ? publicLedger.invoices.lookup(id) : undefined;
      return {
        ...receipt,
        invoiceId,
        exists,
        status: record?.status ?? InvoiceStatus.OPEN,
        expiresAt: record === undefined ? 0 : expiryAsNumber(record.expiresAt),
      };
    });
  }

  // Public reads need no wallet, so they share the observer's implementation.
  getInvoiceStatus(invoiceId: string): Promise<{
    readonly status: InvoiceStatus;
    readonly expiresAt: number;
    readonly exists: boolean;
  }> {
    return readInvoiceStatus(this.providers, this.contractAddress, invoiceId);
  }

  watchInvoice(invoiceId: string): Observable<InvoiceStatus> {
    return observeInvoiceStatus(this.providers, this.contractAddress, invoiceId);
  }
}

export const createTacitPayApi = async (
  options: CreateTacitPayApiOptions,
): Promise<TacitPayApi> => {
  if (!(options.paymentToken instanceof Uint8Array) || options.paymentToken.length !== 32) {
    throw new TypeError('paymentToken must be a 32-byte Uint8Array');
  }
  try {
    const connected = await connectContract(options);
    const state = await options.providers.publicDataProvider.queryContractState(connected.address);
    if (state === null) throw new Error(`No TacitPay contract found at ${connected.address}`);
    const publicLedger = ledger(state.data);
    if (!equalBytes(publicLedger.paymentToken, options.paymentToken)) {
      throw new Error('Configured payment token does not match the deployed TacitPay contract');
    }
    return new TacitPayApiImplementation(
      connected.address,
      options.role,
      connected.deploymentTxId,
      options.providers,
      connected.contract,
      options.paymentToken,
    );
  } catch (error) {
    throw toTacitPayError(error);
  }
};
