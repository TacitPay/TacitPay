export const PROOF_STAGES = [
  'Building transaction',
  'Generating proof',
  'Balancing fees',
  'Submitting',
  'Waiting for confirmation',
] as const;

export type ProofStage = (typeof PROOF_STAGES)[number];

export type InvoiceStatus = 'OPEN' | 'PAID' | 'WITHDRAWN' | 'CANCELLED';

export type InvoiceNetwork = 'preview' | 'local';

export interface InvoiceLinkPayload {
  readonly v: 1;
  readonly net: InvoiceNetwork;
  readonly contract: string;
  readonly id: string;
  readonly amount: bigint;
  readonly token: string;
  readonly memo: string;
  readonly salt: string;
  readonly exp: number;
}

export interface InvoiceView {
  readonly invoiceId: string;
  readonly amount: bigint;
  readonly token: string;
  readonly memo: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly status: InvoiceStatus;
  readonly link: string;
  readonly txId: string;
}

export interface ReceiptView {
  readonly invoiceId: string;
  readonly amount: bigint;
  readonly token: string;
  readonly memo: string;
  readonly paidAt: number;
  readonly status: InvoiceStatus;
  readonly txId: string;
}

export interface Subscription {
  unsubscribe(): void;
}

export type ObservableObserver<T> =
  | ((value: T) => void)
  | {
      next(value: T): void;
      error?(error: unknown): void;
    };

export interface Observable<T> {
  subscribe(observer: ObservableObserver<T>): Subscription;
}

// Wave 1 subset of PRD §8.1. Keep this boundary framework-agnostic.
export interface TacitPayApi {
  readonly contractAddress: string;
  readonly role: 'merchant' | 'payer' | 'observer';

  createInvoice(input: {
    amount: bigint;
    memo: string;
    expiresAt?: number;
  }): Promise<{ invoiceId: string; link: string; txId: string }>;
  withdraw(invoiceId: string): Promise<{ txId: string }>;
  cancelInvoice(invoiceId: string): Promise<{ txId: string }>;
  listMyInvoices(): Promise<InvoiceView[]>;

  decodeLink(link: string): InvoiceLinkPayload;
  payInvoice(payload: InvoiceLinkPayload): Promise<{ txId: string }>;
  listMyReceipts(): Promise<ReceiptView[]>;

  getInvoiceStatus(
    invoiceId: string,
  ): Promise<{ status: InvoiceStatus; expiresAt: number; exists: boolean }>;
  watchInvoice(invoiceId: string): Observable<InvoiceStatus>;
}
