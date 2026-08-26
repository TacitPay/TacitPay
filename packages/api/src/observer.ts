import { InvoiceStatus, ledger } from '@tacitpay/contracts/managed/tacitpay/contract';
import { catchError, map, type Observable, throwError } from 'rxjs';

import { bytes32FromHex, parseHexBytes32 } from './bytes.js';
import { toTacitPayError } from './errors.js';
import type { HexInvoiceId, TacitPayProviders } from './types.js';

/**
 * Reading an invoice's public status needs one provider and nothing else — no wallet, no
 * proving, no private state. Keeping that path separate is what lets `/verify/<id>` work
 * for someone who has never installed a wallet, which is the whole point of a public
 * verification page: a third party must be able to confirm settlement without being a
 * participant, and without asking anyone's permission.
 */
export type ObserverProviders = Pick<TacitPayProviders, 'publicDataProvider'>;

export type InvoiceStatusView = {
  readonly status: InvoiceStatus;
  readonly expiresAt: number;
  readonly exists: boolean;
};

const expiryAsNumber = (value: bigint): number => {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('On-chain invoice expiry exceeds JavaScript safe integer range');
  }
  return Number(value);
};

/** Reads the contract's public ledger, mapping a missing contract to an actionable error. */
export const queryPublicLedger = async (
  providers: ObserverProviders,
  contractAddress: string,
): Promise<ReturnType<typeof ledger>> => {
  try {
    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    if (state === null) throw new Error(`No TacitPay contract found at ${contractAddress}`);
    return ledger(state.data);
  } catch (error) {
    throw toTacitPayError(error);
  }
};

/**
 * An unknown invoice is reported as `exists: false` rather than thrown. A verification page
 * is routinely opened with an id that was mistyped, already pruned, or simply never existed,
 * and "no such invoice" is an answer — not a failure.
 */
export const readInvoiceStatus = async (
  providers: ObserverProviders,
  contractAddress: string,
  invoiceId: HexInvoiceId,
): Promise<InvoiceStatusView> => {
  const id = bytes32FromHex(parseHexBytes32(invoiceId, 'invoiceId'), 'invoiceId');
  const publicLedger = await queryPublicLedger(providers, contractAddress);
  if (!publicLedger.invoices.member(id)) {
    return { status: InvoiceStatus.OPEN, expiresAt: 0, exists: false };
  }
  const record = publicLedger.invoices.lookup(id);
  return { status: record.status, expiresAt: expiryAsNumber(record.expiresAt), exists: true };
};

/** Live status, straight off the indexer subscription. */
export const observeInvoiceStatus = (
  providers: ObserverProviders,
  contractAddress: string,
  invoiceId: HexInvoiceId,
): Observable<InvoiceStatus> => {
  try {
    const id = bytes32FromHex(parseHexBytes32(invoiceId, 'invoiceId'), 'invoiceId');
    return providers.publicDataProvider
      .contractStateObservable(contractAddress, { type: 'latest' })
      .pipe(
        map((state) => {
          const publicLedger = ledger(state.data);
          if (!publicLedger.invoices.member(id)) throw new Error('Unknown invoice');
          return publicLedger.invoices.lookup(id).status;
        }),
        catchError((error: unknown) => throwError(() => toTacitPayError(error))),
      );
  } catch (error) {
    return throwError(() => toTacitPayError(error));
  }
};

/** The read-only surface of {@link TacitPayApi}, available without a wallet. */
export interface TacitPayObserver {
  readonly contractAddress: string;
  getInvoiceStatus(invoiceId: string): Promise<InvoiceStatusView>;
  watchInvoice(invoiceId: string): Observable<InvoiceStatus>;
}

/**
 * Builds the observer. Unlike {@link createTacitPayApi} this does not connect to the
 * contract, because there is nothing to connect to: every read goes through the indexer.
 * It therefore cannot fail at construction time, which matters — a verification page should
 * render and then report a problem, not refuse to load.
 */
export const createObserverApi = (
  providers: ObserverProviders,
  contractAddress: string,
): TacitPayObserver => {
  const address = parseHexBytes32(contractAddress, 'contractAddress');
  return {
    contractAddress: address,
    getInvoiceStatus: (invoiceId) => readInvoiceStatus(providers, address, invoiceId),
    watchInvoice: (invoiceId) => observeInvoiceStatus(providers, address, invoiceId),
  };
};
