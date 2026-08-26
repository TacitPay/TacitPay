import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import {
  InvoiceStatus,
  type Ledger,
  type Witnesses,
} from '@tacitpay/contracts/managed/tacitpay/contract';
import type { Observable } from 'rxjs';

export { InvoiceStatus };
export type { Ledger, Witnesses };

export type CircuitIds =
  | 'createInvoice'
  | 'payInvoice'
  | 'payInvoiceUnshielded'
  | 'withdraw'
  | 'withdrawUnshielded'
  | 'cancelInvoice';
export type TacitPayPrivateStateId = 'tacitpay-merchant' | 'tacitpay-payer';
export type TacitPayRole = 'merchant' | 'payer' | 'observer';
export type NetworkId = 'undeployed' | 'preview' | 'preprod' | 'mainnet';

export type HexBytes32 = string;
export type HexInvoiceId = HexBytes32;
export type HexSeriesId = HexBytes32;
export type InvoiceStatusName = 'OPEN' | 'PAID' | 'WITHDRAWN' | 'CANCELLED';
export type PaidPool = 'shielded' | 'unshielded' | null;

export type MerchantInvoiceRecord = {
  readonly amount: bigint;
  readonly memo: string;
  readonly memoHash: HexBytes32;
  readonly salt: HexBytes32;
  readonly expiresAt: number;
  readonly createdAt: number;
  readonly status: InvoiceStatusName;
  readonly txIds: {
    readonly created?: string;
    readonly paid?: string;
    readonly withdrawn?: string;
    readonly cancelled?: string;
  };
  readonly escrowCoin?: {
    readonly nonce: HexBytes32;
    readonly color: HexBytes32;
    readonly value: bigint;
    readonly mtIndex?: bigint;
  };
};

export type MerchantPrivateState = {
  readonly secretKey: Uint8Array;
  readonly invoices: Record<HexInvoiceId, MerchantInvoiceRecord>;
  readonly series?: Record<
    HexSeriesId,
    {
      readonly seed: HexBytes32;
      readonly amount: bigint;
      readonly memoTemplate: string;
      readonly periodDays: number;
      readonly startAt: number;
      readonly nextIndex: number;
      readonly childIds: HexInvoiceId[];
    }
  >;
};

export type PayerReceiptRecord = {
  readonly contractAddress: string;
  readonly amount: bigint;
  readonly memoHash: HexBytes32;
  readonly salt: HexBytes32;
  readonly memo?: string;
  readonly paidAt: number;
  readonly txId: string;
};

export type PayerPrivateState = {
  readonly secretKey: Uint8Array;
  readonly receipts: Record<HexInvoiceId, PayerReceiptRecord>;
};

export type TacitPayPrivateState = MerchantPrivateState | PayerPrivateState;

export type TacitPayProviders = MidnightProviders<
  CircuitIds,
  TacitPayPrivateStateId,
  TacitPayPrivateState
>;

export type InvoiceView = MerchantInvoiceRecord & {
  readonly invoiceId: HexInvoiceId;
  readonly exists: boolean;
  readonly onChainStatus: InvoiceStatus;
  readonly paidPool: PaidPool;
};

export type ReceiptView = PayerReceiptRecord & {
  readonly invoiceId: HexInvoiceId;
  readonly exists: boolean;
  readonly status: InvoiceStatus;
  readonly expiresAt: number;
  readonly paidPool: PaidPool;
};

/** The serialized amount stays decimal text so JSON never loses bigint precision. */
export type InvoiceLinkPayload = {
  readonly v: 1;
  readonly net: NetworkId;
  readonly contract: string;
  readonly id: HexInvoiceId;
  readonly amount: string;
  readonly token: 'NIGHT' | HexBytes32;
  readonly memo: string;
  readonly salt: HexBytes32;
  readonly exp: number;
};

export type LinkValidationContext = {
  readonly network: NetworkId;
  readonly contractAddress: string;
  readonly paymentToken?: 'NIGHT' | HexBytes32 | Uint8Array;
};

export interface TacitPayApi {
  readonly contractAddress: string;
  readonly role: TacitPayRole;
  /** Present only when this API instance deployed the contract. */
  readonly deploymentTxId?: string;

  createInvoice(input: {
    readonly amount: bigint;
    readonly memo: string;
    readonly expiresAt?: number;
  }): Promise<{ readonly invoiceId: string; readonly link: string; readonly txId: string }>;
  withdraw(invoiceId: string): Promise<{ readonly txId: string }>;
  withdrawUnshielded(invoiceId: string, to: string): Promise<{ readonly txId: string }>;
  cancelInvoice(invoiceId: string): Promise<{ readonly txId: string }>;
  listMyInvoices(): Promise<InvoiceView[]>;

  decodeLink(link: string): InvoiceLinkPayload;
  payInvoice(payload: InvoiceLinkPayload): Promise<{ readonly txId: string }>;
  payInvoiceUnshielded(payload: InvoiceLinkPayload): Promise<{ readonly txId: string }>;
  listMyReceipts(): Promise<ReceiptView[]>;

  getInvoiceStatus(invoiceId: string): Promise<{
    readonly status: InvoiceStatus;
    readonly expiresAt: number;
    readonly exists: boolean;
    readonly paidPool: PaidPool;
  }>;
  watchInvoice(invoiceId: string): Observable<InvoiceStatus>;
}

export type CreateTacitPayApiOptions = {
  readonly providers: TacitPayProviders;
  readonly contractAddress?: string;
  readonly role: TacitPayRole;
  readonly paymentToken: Uint8Array;
};
