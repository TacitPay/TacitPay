import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum InvoiceStatus { OPEN = 0, PAID = 1, WITHDRAWN = 2, CANCELLED = 3 }

export type InvoiceRecord = { ownerTag: Uint8Array;
                              commitment: Uint8Array;
                              status: InvoiceStatus;
                              expiresAt: bigint;
                              payerTag: Uint8Array
                            };

export type Witnesses<PS> = {
  merchantSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  payerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  createInvoice(context: __compactRuntime.CircuitContext<PS>,
                invoiceId_0: Uint8Array,
                amount_0: bigint,
                memoHash_0: Uint8Array,
                salt_0: Uint8Array,
                expiresAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  payInvoice(context: __compactRuntime.CircuitContext<PS>,
             invoiceId_0: Uint8Array,
             amount_0: bigint,
             memoHash_0: Uint8Array,
             salt_0: Uint8Array,
             coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  payInvoiceUnshielded(context: __compactRuntime.CircuitContext<PS>,
                       invoiceId_0: Uint8Array,
                       amount_0: bigint,
                       memoHash_0: Uint8Array,
                       salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, invoiceId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  withdrawUnshielded(context: __compactRuntime.CircuitContext<PS>,
                     invoiceId_0: Uint8Array,
                     to_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  cancelInvoice(context: __compactRuntime.CircuitContext<PS>,
                invoiceId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  createInvoice(context: __compactRuntime.CircuitContext<PS>,
                invoiceId_0: Uint8Array,
                amount_0: bigint,
                memoHash_0: Uint8Array,
                salt_0: Uint8Array,
                expiresAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  payInvoice(context: __compactRuntime.CircuitContext<PS>,
             invoiceId_0: Uint8Array,
             amount_0: bigint,
             memoHash_0: Uint8Array,
             salt_0: Uint8Array,
             coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  payInvoiceUnshielded(context: __compactRuntime.CircuitContext<PS>,
                       invoiceId_0: Uint8Array,
                       amount_0: bigint,
                       memoHash_0: Uint8Array,
                       salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, invoiceId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  withdrawUnshielded(context: __compactRuntime.CircuitContext<PS>,
                     invoiceId_0: Uint8Array,
                     to_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  cancelInvoice(context: __compactRuntime.CircuitContext<PS>,
                invoiceId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  createInvoice(context: __compactRuntime.CircuitContext<PS>,
                invoiceId_0: Uint8Array,
                amount_0: bigint,
                memoHash_0: Uint8Array,
                salt_0: Uint8Array,
                expiresAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  payInvoice(context: __compactRuntime.CircuitContext<PS>,
             invoiceId_0: Uint8Array,
             amount_0: bigint,
             memoHash_0: Uint8Array,
             salt_0: Uint8Array,
             coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  payInvoiceUnshielded(context: __compactRuntime.CircuitContext<PS>,
                       invoiceId_0: Uint8Array,
                       amount_0: bigint,
                       memoHash_0: Uint8Array,
                       salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, invoiceId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  withdrawUnshielded(context: __compactRuntime.CircuitContext<PS>,
                     invoiceId_0: Uint8Array,
                     to_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  cancelInvoice(context: __compactRuntime.CircuitContext<PS>,
                invoiceId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly paymentToken: Uint8Array;
  invoices: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): InvoiceRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, InvoiceRecord]>
  };
  escrow: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { nonce: Uint8Array,
                                 color: Uint8Array,
                                 value: bigint,
                                 mt_index: bigint
                               };
    [Symbol.iterator](): Iterator<[Uint8Array, { nonce: Uint8Array, color: Uint8Array, value: bigint, mt_index: bigint }]>
  };
  unshieldedOwed: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  readonly invoiceCount: bigint;
  readonly paidCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               token_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
