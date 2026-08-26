// Mock adapter — replaced by @tacitpay/api (PRD §8) once the Wave 1 contract lands; the interface must not drift from PRD §8.1.
import { endpointsFor, NETWORK_IDS } from './deployment';
import {
  PROOF_STAGES,
  type InvoiceLinkPayload,
  type InvoiceNetwork,
  type InvoiceStatus,
  type InvoiceView,
  type Observable,
  type ObservableObserver,
  type PaidPool,
  type ProofStage,
  type ReceiptView,
  type TacitPayApi,
} from './types';

export const MOCK_CONTRACT_ADDRESS =
  '7a8c13e7f0b24d5a9c1e4376a8b2d4f6091c3e5a7b9d2f406183a5c7e9b1d3f5';

const STORAGE_KEY = 'tacitpay.mock-state.v1';
const HEX_32 = /^[0-9a-f]{64}$/i;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

interface StoredInvoice {
  invoiceId: string;
  amount: string;
  token: string;
  memo: string;
  salt: string;
  createdAt: number;
  expiresAt: number;
  status: InvoiceStatus;
  txId: string;
}

interface StoredReceipt {
  invoiceId: string;
  amount: string;
  token: string;
  memo: string;
  paidAt: number;
  txId: string;
}

interface PersistedState {
  version: 1;
  invoices: StoredInvoice[];
  receipts: StoredReceipt[];
}

export interface MockApiOptions {
  network: InvoiceNetwork;
  onProofStage?: (stage: ProofStage | null) => void;
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

/** Sandbox ids are deliberately unmistakable: a 12345… banner with a random
 *  tail for uniqueness. Chain output never looks like this, so a screenshot of
 *  sandbox data can no longer pass for the real thing. */
function sandboxId() {
  return '12345'.repeat(9) + randomHex().slice(0, 19);
}

function randomHex(bytes = 32) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string) {
  if (!value || !BASE64URL.test(value)) {
    throw new Error('This invoice link has an invalid private payload.');
  }

  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/') + padding;

  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('This invoice link has an invalid private payload.');
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('This invoice link is not valid.');
  }
  return value as Record<string, unknown>;
}

function readHex(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== 'string' || !HEX_32.test(value)) {
    throw new Error(`Invoice link field “${key}” is not valid.`);
  }
  return value.toLowerCase();
}

function getFragment(link: string) {
  const trimmed = link.trim();
  const hashIndex = trimmed.indexOf('#');
  if (hashIndex >= 0) return trimmed.slice(hashIndex + 1);

  // A raw fragment is useful for demos, but a URL must use # rather than ?.
  if (trimmed.includes('?') || trimmed.includes('/pay')) {
    throw new Error(
      'Invoice links must keep their private payload after #, not in a query string.',
    );
  }
  return trimmed;
}

export function encodeInvoiceLink(payload: InvoiceLinkPayload, origin = window.location.origin) {
  const serializable = {
    ...payload,
    // The wire format speaks Midnight's network ids ('undeployed'), UI payloads speak
    // the app's own ('local'). Translate on the way out so mock-minted links carry the
    // same encoding the CLI mints — decodeInvoiceLink translates on the way back in.
    net: NETWORK_IDS[payload.net],
    amount: payload.amount.toString(),
  };
  return `${origin}/pay#${toBase64Url(JSON.stringify(serializable))}`;
}

export function decodeInvoiceLink(
  link: string,
  expected: { network: InvoiceNetwork },
): InvoiceLinkPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(getFragment(link)));
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('This invoice link') || error.message.startsWith('Invoice links'))
    ) {
      throw error;
    }
    throw new Error('This invoice link is not valid JSON.');
  }

  const record = asRecord(parsed);
  if (record.v !== 1) throw new Error('This invoice link version is not supported.');

  // Links carry Midnight's own network id, where the local devnet is called
  // "undeployed" — the UI calls that same chain "local". Translate before comparing,
  // as the wallet-backed adapter does (real.ts uiNetwork); comparing raw rejected
  // every link the CLI mints for a local devnet as foreign.
  if (record.net !== NETWORK_IDS[expected.network]) {
    const shown = record.net === 'undeployed' ? 'local' : String(record.net);
    throw new Error(`This invoice is for ${shown}, not ${expected.network}.`);
  }

  // Format-checked but deliberately NOT compared against MOCK_CONTRACT_ADDRESS: the
  // mock stands in for no particular contract, so equality against its fictional
  // address would reject every real link. The wallet-backed path still enforces
  // that the link's contract matches the one actually connected.
  const contract = readHex(record, 'contract');

  const amountText = record.amount;
  if (typeof amountText !== 'string' || !/^[0-9]+$/u.test(amountText)) {
    throw new Error('Invoice link field “amount” is not valid.');
  }
  const amount = BigInt(amountText);
  if (amount <= 0n) throw new Error('Amount must be positive');

  const tokenSymbol = endpointsFor(expected.network).tokenSymbol;
  if (
    record.token !== tokenSymbol &&
    (typeof record.token !== 'string' || !HEX_32.test(record.token))
  ) {
    throw new Error('Invoice link field “token” is not valid.');
  }
  if (typeof record.memo !== 'string' || record.memo.length > 280) {
    throw new Error('Invoice link field “memo” is not valid.');
  }
  if (!Number.isSafeInteger(record.exp) || Number(record.exp) < 0) {
    throw new Error('Invoice link field “exp” is not valid.');
  }

  return {
    v: 1,
    net: expected.network,
    contract,
    id: readHex(record, 'id'),
    amount,
    token: record.token,
    memo: record.memo,
    salt: readHex(record, 'salt'),
    exp: Number(record.exp),
  };
}

function seedState(network: InvoiceNetwork): PersistedState {
  const token = endpointsFor(network).tokenSymbol;
  const now = Math.floor(Date.now() / 1000);
  return {
    version: 1,
    invoices: [
      {
        invoiceId: '11'.repeat(32),
        amount: '1250000',
        token,
        memo: 'Logo design — final',
        salt: 'a1'.repeat(32),
        createdAt: now - 2 * 60 * 60,
        expiresAt: now + 2 * 24 * 60 * 60,
        status: 'OPEN',
        txId: 'c1'.repeat(32),
      },
      {
        invoiceId: '22'.repeat(32),
        amount: '8750000',
        token,
        memo: 'Q3 research sprint',
        salt: 'b2'.repeat(32),
        createdAt: now - 7 * 24 * 60 * 60,
        expiresAt: now + 7 * 24 * 60 * 60,
        status: 'PAID',
        txId: 'c2'.repeat(32),
      },
      {
        invoiceId: '33'.repeat(32),
        amount: '24000000',
        token,
        memo: 'Product launch retainer',
        salt: 'c3'.repeat(32),
        createdAt: now - 14 * 24 * 60 * 60,
        expiresAt: 0,
        status: 'WITHDRAWN',
        txId: 'c3'.repeat(32),
      },
    ],
    receipts: [
      {
        invoiceId: '33'.repeat(32),
        amount: '24000000',
        token,
        memo: 'Product launch retainer',
        paidAt: now - 13 * 24 * 60 * 60,
        txId: 'd3'.repeat(32),
      },
    ],
  };
}

function loadState(network: InvoiceNetwork): PersistedState {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return seedState(network);
    const parsed = JSON.parse(value) as Partial<PersistedState>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.invoices) ||
      !Array.isArray(parsed.receipts)
    ) {
      return seedState(network);
    }
    return parsed as PersistedState;
  } catch {
    return seedState(network);
  }
}

function notifyObserver(observer: ObservableObserver<InvoiceStatus>, status: InvoiceStatus) {
  if (typeof observer === 'function') observer(status);
  else observer.next(status);
}

class MockTacitPayApi implements TacitPayApi {
  readonly contractAddress = MOCK_CONTRACT_ADDRESS;
  readonly role = 'merchant' as const;

  private state: PersistedState;
  private readonly watchers = new Map<string, Set<ObservableObserver<InvoiceStatus>>>();

  constructor(private readonly options: MockApiOptions) {
    this.state = loadState(options.network);
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // The in-memory demo still works when browser storage is disabled or full.
    }
  }

  private findInvoice(invoiceId: string) {
    return this.state.invoices.find((invoice) => invoice.invoiceId === invoiceId.toLowerCase());
  }

  private paidPoolFor(invoice: StoredInvoice | undefined): PaidPool {
    return invoice?.status === 'PAID' ? endpointsFor(this.options.network).settlementLane : null;
  }

  private payloadFor(invoice: StoredInvoice): InvoiceLinkPayload {
    return {
      v: 1,
      net: this.options.network,
      contract: this.contractAddress,
      id: invoice.invoiceId,
      amount: BigInt(invoice.amount),
      token: invoice.token,
      memo: invoice.memo,
      salt: invoice.salt,
      exp: invoice.expiresAt,
    };
  }

  private toView(invoice: StoredInvoice): InvoiceView {
    return {
      invoiceId: invoice.invoiceId,
      amount: BigInt(invoice.amount),
      token: invoice.token,
      memo: invoice.memo,
      createdAt: invoice.createdAt,
      expiresAt: invoice.expiresAt,
      status: invoice.status,
      paidPool: this.paidPoolFor(invoice),
      link: encodeInvoiceLink(this.payloadFor(invoice)),
      txId: invoice.txId,
    };
  }

  private emit(invoice: StoredInvoice) {
    for (const observer of this.watchers.get(invoice.invoiceId) ?? []) {
      notifyObserver(observer, invoice.status);
    }
  }

  private async runProof<T>(mutation: () => T): Promise<T> {
    const stageDurations = [320, 650, 420, 360, 540];
    try {
      for (const [index, stage] of PROOF_STAGES.entries()) {
        this.options.onProofStage?.(stage);
        await wait(stageDurations[index] ?? 400);
      }
      return mutation();
    } finally {
      this.options.onProofStage?.(null);
    }
  }

  async createInvoice(input: { amount: bigint; memo: string; expiresAt?: number }) {
    if (input.amount <= 0n) throw new Error('Amount must be positive');
    if (!input.memo.trim()) throw new Error('Add a memo for this invoice.');
    const now = Math.floor(Date.now() / 1000);
    if (input.expiresAt && input.expiresAt <= now) {
      throw new Error('Expiry must be in the future.');
    }

    return this.runProof(() => {
      const invoice: StoredInvoice = {
        invoiceId: sandboxId(),
        amount: input.amount.toString(),
        token: endpointsFor(this.options.network).tokenSymbol,
        memo: input.memo.trim(),
        salt: sandboxId(),
        createdAt: now,
        expiresAt: input.expiresAt ?? 0,
        status: 'OPEN',
        txId: sandboxId(),
      };
      this.state.invoices.unshift(invoice);
      this.persist();
      this.emit(invoice);
      return { invoiceId: invoice.invoiceId, link: this.toView(invoice).link, txId: invoice.txId };
    });
  }

  async withdraw(invoiceId: string) {
    const invoice = this.findInvoice(invoiceId);
    if (!invoice || invoice.status !== 'PAID') throw new Error('Nothing to withdraw');

    return this.runProof(() => {
      invoice.status = 'WITHDRAWN';
      invoice.txId = sandboxId();
      this.persist();
      this.emit(invoice);
      return { txId: invoice.txId };
    });
  }

  async cancelInvoice(invoiceId: string) {
    const invoice = this.findInvoice(invoiceId);
    if (!invoice || invoice.status !== 'OPEN') {
      throw new Error('Only open invoices can be cancelled');
    }

    return this.runProof(() => {
      invoice.status = 'CANCELLED';
      invoice.txId = sandboxId();
      this.persist();
      this.emit(invoice);
      return { txId: invoice.txId };
    });
  }

  async listMyInvoices() {
    await wait(420);
    return this.state.invoices
      .slice()
      .sort((left, right) => right.createdAt - left.createdAt)
      .map((invoice) => this.toView(invoice));
  }

  decodeLink(link: string) {
    return decodeInvoiceLink(link, { network: this.options.network });
  }

  async payInvoice(payload: InvoiceLinkPayload) {
    const validated = this.decodeLink(encodeInvoiceLink(payload));
    const invoice = this.findInvoice(validated.id);
    if (!invoice) throw new Error('Unknown invoice');
    if (invoice.status !== 'OPEN') throw new Error('Invoice is not open');
    if (invoice.expiresAt > 0 && invoice.expiresAt <= Math.floor(Date.now() / 1000)) {
      throw new Error('Invoice expired');
    }
    if (
      invoice.amount !== validated.amount.toString() ||
      invoice.token !== validated.token ||
      invoice.memo !== validated.memo ||
      invoice.salt !== validated.salt ||
      invoice.expiresAt !== validated.exp
    ) {
      throw new Error('Invoice details do not match');
    }

    return this.runProof(() => {
      invoice.status = 'PAID';
      const txId = sandboxId();
      invoice.txId = txId;
      this.state.receipts.unshift({
        invoiceId: invoice.invoiceId,
        amount: invoice.amount,
        token: invoice.token,
        memo: invoice.memo,
        paidAt: Math.floor(Date.now() / 1000),
        txId,
      });
      this.persist();
      this.emit(invoice);
      return { txId };
    });
  }

  async listMyReceipts(): Promise<ReceiptView[]> {
    await wait(420);
    return this.state.receipts.map((receipt) => {
      const invoice = this.findInvoice(receipt.invoiceId);
      return {
        invoiceId: receipt.invoiceId,
        amount: BigInt(receipt.amount),
        token: receipt.token,
        memo: receipt.memo,
        paidAt: receipt.paidAt,
        status: invoice?.status ?? 'PAID',
        paidPool: this.paidPoolFor(invoice),
        txId: receipt.txId,
      };
    });
  }

  async getInvoiceStatus(invoiceId: string) {
    await wait(360);
    const invoice = this.findInvoice(invoiceId);
    return invoice
      ? {
          status: invoice.status,
          expiresAt: invoice.expiresAt,
          exists: true,
          paidPool: this.paidPoolFor(invoice),
        }
      : { status: 'OPEN' as const, expiresAt: 0, exists: false, paidPool: null };
  }

  watchInvoice(invoiceId: string): Observable<InvoiceStatus> {
    const normalizedId = invoiceId.toLowerCase();
    return {
      subscribe: (observer) => {
        const observers = this.watchers.get(normalizedId) ?? new Set();
        observers.add(observer);
        this.watchers.set(normalizedId, observers);

        const current = this.findInvoice(normalizedId);
        if (current) queueMicrotask(() => notifyObserver(observer, current.status));

        return {
          unsubscribe: () => {
            observers.delete(observer);
            if (observers.size === 0) this.watchers.delete(normalizedId);
          },
        };
      },
    };
  }
}

export function createMockTacitPayApi(options: MockApiOptions): TacitPayApi {
  return new MockTacitPayApi(options);
}
