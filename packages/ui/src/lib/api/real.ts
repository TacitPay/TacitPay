import {
  createBrowserPrivateStoragePasswordProvider,
  createBrowserProviders,
  type BrowserWalletApi,
  type ProvingSelection,
} from '@tacitpay/api/browser';
import {
  createTacitPayApi,
  encodeLink,
  InvoiceStatus as LedgerInvoiceStatus,
  NIGHT_TOKEN_COLOR,
  PREVIEW_USDM_TOKEN_COLOR,
  type InvoiceLinkPayload as ApiLinkPayload,
  type NetworkId,
  type TacitPayApi as ApiTacitPayApi,
  type TacitPayProviders,
  type TacitPayRole,
} from '@tacitpay/api';
import { endpointsFor, NETWORK_IDS } from './deployment';
import type {
  InvoiceLinkPayload,
  InvoiceNetwork,
  InvoiceStatus,
  InvoiceView,
  Observable,
  ProofStage,
  ReceiptView,
  TacitPayApi,
} from './types';

const UI_NETWORKS: Partial<Record<NetworkId, InvoiceNetwork>> = {
  undeployed: 'local',
  preview: 'preview',
};

const STATUS_NAMES: Record<number, InvoiceStatus> = {
  [LedgerInvoiceStatus.OPEN]: 'OPEN',
  [LedgerInvoiceStatus.PAID]: 'PAID',
  [LedgerInvoiceStatus.WITHDRAWN]: 'WITHDRAWN',
  [LedgerInvoiceStatus.CANCELLED]: 'CANCELLED',
};

const statusName = (status: LedgerInvoiceStatus): InvoiceStatus => {
  const name = STATUS_NAMES[status];
  if (name === undefined) throw new Error(`Unknown invoice status ${String(status)}`);
  return name;
};

const uiNetwork = (network: NetworkId): InvoiceNetwork => {
  const mapped = UI_NETWORKS[network];
  if (mapped === undefined) {
    throw new Error(`This build does not support the ${network} network.`);
  }
  return mapped;
};

/** The link payload crosses the boundary as decimal text so bigint precision survives JSON. */
const toUiPayload = (payload: ApiLinkPayload): InvoiceLinkPayload => ({
  v: 1,
  net: uiNetwork(payload.net),
  contract: payload.contract,
  id: payload.id,
  amount: BigInt(payload.amount),
  token: payload.token,
  memo: payload.memo,
  salt: payload.salt,
  exp: payload.exp,
});

const toApiPayload = (payload: InvoiceLinkPayload): ApiLinkPayload => ({
  v: 1,
  net: NETWORK_IDS[payload.net],
  contract: payload.contract,
  id: payload.id,
  amount: payload.amount.toString(),
  token: payload.token as ApiLinkPayload['token'],
  memo: payload.memo,
  salt: payload.salt,
  exp: payload.exp,
});

export type ProofStageListener = (stage: ProofStage | null) => void;

/**
 * Reports the five PRD §9 proof stages by wrapping the three providers that perform them,
 * rather than guessing at timings. Each stage is emitted at the moment the corresponding
 * provider is actually entered, so the stepper reflects real work.
 */
const instrumentProviders = (
  providers: TacitPayProviders,
  onStage: ProofStageListener,
): TacitPayProviders => ({
  ...providers,
  proofProvider: {
    proveTx: async (unprovenTx, config) => {
      onStage('Generating proof');
      return providers.proofProvider.proveTx(unprovenTx, config);
    },
  },
  walletProvider: {
    getCoinPublicKey: () => providers.walletProvider.getCoinPublicKey(),
    getEncryptionPublicKey: () => providers.walletProvider.getEncryptionPublicKey(),
    balanceTx: async (tx, ttl) => {
      onStage('Balancing fees');
      return providers.walletProvider.balanceTx(tx, ttl);
    },
  },
  midnightProvider: {
    submitTx: async (tx) => {
      onStage('Submitting');
      const txId = await providers.midnightProvider.submitTx(tx);
      // midnight-js blocks on watchForTxData after this resolves.
      onStage('Waiting for confirmation');
      return txId;
    },
  },
});

export type RealApiOptions = {
  readonly network: InvoiceNetwork;
  readonly contractAddress: string;
  readonly wallet: BrowserWalletApi;
  /** Encrypts the on-device private state; never leaves the browser. */
  readonly passphrase: string;
  /** Identifies this account's private-state store. The wallet's address is a good value. */
  readonly accountId: string;
  readonly proving: ProvingSelection;
  readonly token?: 'NIGHT' | 'USDM';
  readonly onProofStage?: ProofStageListener;
};

const tokenColor = (token: RealApiOptions['token']): Uint8Array =>
  token === 'USDM' ? PREVIEW_USDM_TOKEN_COLOR : NIGHT_TOKEN_COLOR;

/**
 * Adapts `@tacitpay/api` to the UI's framework-agnostic §8.1 boundary.
 *
 * The two interfaces are deliberately not identical: the UI works in display shapes
 * (`bigint` amounts, status names, a ready-made link), the library works in the shapes the
 * chain and private state actually hold. This function is the only place they meet.
 *
 * A library instance is bound to one role, because the role decides which private-state
 * record backs it (`tacitpay-merchant` or `tacitpay-payer`) and which witness a circuit is
 * allowed to read. The UI's interface spans both, so one instance of each is created and
 * every method is dispatched to the one that owns it.
 */
export const createRealTacitPayApi = async (options: RealApiOptions): Promise<TacitPayApi> => {
  const networkId = NETWORK_IDS[options.network];
  const endpoints = endpointsFor(options.network);
  const paymentToken = tokenColor(options.token);
  const emit: ProofStageListener = options.onProofStage ?? (() => undefined);

  const { providers } = await createBrowserProviders({
    networkId,
    accountId: options.accountId,
    privateStoragePasswordProvider: createBrowserPrivateStoragePasswordProvider(
      options.passphrase,
      options.accountId,
    ),
    indexerHttpUrl: endpoints.indexerUrl,
    indexerWsUrl: endpoints.indexerWsUrl,
    // Served by the vite plugin in dev and copied into dist/ for a static host.
    zkConfigBaseUrl: new URL('/managed/tacitpay', window.location.origin).href,
    api: options.wallet,
    proving: options.proving,
  });

  const instrumented = instrumentProviders(providers, emit);
  const forRole = (role: TacitPayRole): Promise<ApiTacitPayApi> =>
    createTacitPayApi({
      providers: instrumented,
      contractAddress: options.contractAddress,
      role,
      paymentToken,
    });

  const [merchant, payer] = await Promise.all([forRole('merchant'), forRole('payer')]);
  return new RealTacitPayApi(merchant, payer, options, emit);
};

class RealTacitPayApi implements TacitPayApi {
  constructor(
    private readonly merchant: ApiTacitPayApi,
    private readonly payer: ApiTacitPayApi,
    private readonly options: RealApiOptions,
    private readonly emit: ProofStageListener,
  ) {}

  private get api(): ApiTacitPayApi {
    // Reads that need no witness are identical on either instance.
    return this.merchant;
  }

  get contractAddress(): string {
    return this.merchant.contractAddress;
  }

  /** Both roles are live at once; the UI decides which surface it is showing. */
  get role(): 'merchant' | 'payer' | 'observer' {
    return 'merchant';
  }

  /** Wraps one circuit call so the stepper opens and always closes, error or not. */
  private async withStages<T>(run: () => Promise<T>): Promise<T> {
    this.emit('Building transaction');
    try {
      return await run();
    } finally {
      this.emit(null);
    }
  }

  /**
   * `listMyInvoices` returns the private record, not a link — the link is derived, and
   * every field it needs is already on the record.
   */
  private linkFor(invoice: {
    invoiceId: string;
    amount: bigint;
    memo: string;
    salt: string;
    expiresAt: number;
  }): string {
    return encodeLink({
      v: 1,
      net: NETWORK_IDS[this.options.network],
      contract: this.merchant.contractAddress,
      id: invoice.invoiceId,
      amount: invoice.amount.toString(),
      token: this.tokenLabel,
      memo: invoice.memo,
      salt: invoice.salt,
      exp: invoice.expiresAt,
    });
  }

  private get tokenLabel(): ApiLinkPayload['token'] {
    return this.options.token === 'USDM'
      ? (Buffer.from(PREVIEW_USDM_TOKEN_COLOR).toString('hex') as ApiLinkPayload['token'])
      : 'NIGHT';
  }

  createInvoice(input: {
    amount: bigint;
    memo: string;
    expiresAt?: number;
  }): Promise<{ invoiceId: string; link: string; txId: string }> {
    return this.withStages(async () => {
      const created = await this.merchant.createInvoice(input);
      return { invoiceId: created.invoiceId, link: created.link, txId: created.txId };
    });
  }

  withdraw(invoiceId: string): Promise<{ txId: string }> {
    return this.withStages(async () => ({ txId: (await this.merchant.withdraw(invoiceId)).txId }));
  }

  cancelInvoice(invoiceId: string): Promise<{ txId: string }> {
    return this.withStages(async () => ({
      txId: (await this.merchant.cancelInvoice(invoiceId)).txId,
    }));
  }

  async listMyInvoices(): Promise<InvoiceView[]> {
    const invoices = await this.merchant.listMyInvoices();
    return invoices.map((invoice) => ({
      invoiceId: invoice.invoiceId,
      amount: invoice.amount,
      token: this.tokenLabel,
      memo: invoice.memo,
      createdAt: invoice.createdAt,
      expiresAt: invoice.expiresAt,
      status: statusName(invoice.onChainStatus),
      link: this.linkFor(invoice),
      txId: invoice.txIds.created ?? '',
    }));
  }

  decodeLink(link: string): InvoiceLinkPayload {
    return toUiPayload(this.payer.decodeLink(link));
  }

  payInvoice(payload: InvoiceLinkPayload): Promise<{ txId: string }> {
    return this.withStages(async () => ({
      txId: (await this.payer.payInvoice(toApiPayload(payload))).txId,
    }));
  }

  async listMyReceipts(): Promise<ReceiptView[]> {
    const receipts = await this.payer.listMyReceipts();
    return receipts.map((receipt) => ({
      invoiceId: receipt.invoiceId,
      amount: receipt.amount,
      token: this.tokenLabel,
      // The memo is stored only when the payer opened the link on this device.
      memo: receipt.memo ?? '',
      paidAt: receipt.paidAt,
      status: statusName(receipt.status),
      txId: receipt.txId,
    }));
  }

  async getInvoiceStatus(
    invoiceId: string,
  ): Promise<{ status: InvoiceStatus; expiresAt: number; exists: boolean }> {
    const result = await this.api.getInvoiceStatus(invoiceId);
    return {
      status: statusName(result.status),
      expiresAt: result.expiresAt,
      exists: result.exists,
    };
  }

  watchInvoice(invoiceId: string): Observable<InvoiceStatus> {
    const source = this.api.watchInvoice(invoiceId);
    return {
      subscribe(observer) {
        const next = typeof observer === 'function' ? observer : observer.next.bind(observer);
        const error = typeof observer === 'function' ? undefined : observer.error?.bind(observer);
        const subscription = source.subscribe({
          next: (status) => next(statusName(status)),
          error: (cause: unknown) => error?.(cause),
        });
        return { unsubscribe: () => subscription.unsubscribe() };
      },
    };
  }
}
