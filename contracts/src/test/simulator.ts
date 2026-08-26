import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type CircuitContext,
} from '@midnight-ntwrk/compact-runtime';

import { Contract, ledger, type Ledger } from '../../managed/tacitpay/contract/index.js';
import { createTacitPayPrivateState, witnesses, type TacitPayPrivateState } from '../witnesses.js';

// Offline simulator for the Wave 1 contract (PRD §11.1 layer 1). Everything
// here runs in the pure-JS compact-runtime — no proof server, no node.

/** 32 bytes filled with one value — deterministic, obviously-fake fixtures. */
export const bytes32 = (fill: number): Uint8Array => new Uint8Array(32).fill(fill);

export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/** Merchant persona (secret A) and payer persona (secret B) — see PRD §6.3. */
export const MERCHANT_SECRET_KEY = bytes32(0xa1);
export const PAYER_SECRET_KEY = bytes32(0xb2);

// A real payer never holds the merchant's secret. Handing the payer path this
// decoy instead keeps the role separation enforced by the tests: if a payer
// circuit ever started reading merchantSecret(), the derived tag would not
// match and the test would fail rather than silently pass.
const DECOY_MERCHANT_SECRET_KEY = bytes32(0x00);

/** Zswap coin keys, i.e. who created the transaction. Backs ownPublicKey(). */
export const MERCHANT_COIN_PUBLIC_KEY = bytes32(0xc3);
export const PAYER_COIN_PUBLIC_KEY = bytes32(0xd4);

/** Token colour this contract instance accepts (PRD §6.2). */
export const PAYMENT_TOKEN = bytes32(0x01);

/** Fixed simulated block time (unix seconds) so expiry tests are deterministic. */
export const DEFAULT_BLOCK_TIME_SECONDS = 1_700_000_000;

/** The unqualified coin shape payInvoice takes (stdlib ShieldedCoinInfo). */
export type ShieldedCoin = {
  nonce: Uint8Array;
  color: Uint8Array;
  value: bigint;
};

export const shieldedCoin = (
  value: bigint,
  color: Uint8Array = PAYMENT_TOKEN,
  nonce: Uint8Array = bytes32(0x55),
): ShieldedCoin => ({ nonce, color, value });

/**
 * Drives the generated contract across calls, threading private state, Zswap
 * local state and query context forward the way a real DApp session would.
 *
 * Both role secrets live in one private-state record so a single instance can
 * act as either persona; the contract only ever reads the witness matching the
 * circuit's role, so merchant circuits see secret A and payer circuits see B.
 */
export class TacitPaySimulator {
  private readonly contract: Contract<TacitPayPrivateState>;
  private context: CircuitContext<TacitPayPrivateState>;

  constructor(
    paymentToken: Uint8Array = PAYMENT_TOKEN,
    blockTimeSeconds: number = DEFAULT_BLOCK_TIME_SECONDS,
  ) {
    this.contract = new Contract<TacitPayPrivateState>(witnesses);
    const initial = this.contract.initialState(
      createConstructorContext(createTacitPayPrivateState(MERCHANT_SECRET_KEY, PAYER_SECRET_KEY), {
        bytes: MERCHANT_COIN_PUBLIC_KEY,
      }),
      paymentToken,
    );
    this.context = createCircuitContext(
      sampleContractAddress(),
      initial.currentZswapLocalState,
      initial.currentContractState,
      initial.currentPrivateState,
      undefined,
      undefined,
      blockTimeSeconds,
    );
  }

  /** Decoded public ledger state as it stands after the last call (PRD §6.2). */
  ledger(): Ledger {
    return ledger(this.context.currentQueryContext.state);
  }

  /** Client-side wallet view: coins consumed and produced. Never public state. */
  zswapState(): CircuitContext<TacitPayPrivateState>['currentZswapLocalState'] {
    return this.context.currentZswapLocalState;
  }

  /** Sets the simulated block time in unix seconds — what blockTimeLt reads. */
  setBlockTimeSeconds(seconds: number | bigint): void {
    // The whole CallContext must be reassigned; a partial object fails to
    // deserialize on the way into the WASM runtime.
    this.context.currentQueryContext.block = {
      ...this.context.currentQueryContext.block,
      secondsSinceEpoch: BigInt(seconds),
    };
  }

  createInvoice(
    invoiceId: Uint8Array,
    amount: bigint,
    memoHash: Uint8Array,
    salt: Uint8Array,
    expiresAt: bigint = 0n,
  ): void {
    this.asPersona(MERCHANT_COIN_PUBLIC_KEY, MERCHANT_SECRET_KEY);
    this.context = this.contract.impureCircuits.createInvoice(
      this.context,
      invoiceId,
      amount,
      memoHash,
      salt,
      expiresAt,
    ).context;
  }

  payInvoice(
    invoiceId: Uint8Array,
    amount: bigint,
    memoHash: Uint8Array,
    salt: Uint8Array,
    coin: ShieldedCoin,
  ): void {
    this.asPersona(PAYER_COIN_PUBLIC_KEY, DECOY_MERCHANT_SECRET_KEY);
    this.context = this.contract.impureCircuits.payInvoice(
      this.context,
      invoiceId,
      amount,
      memoHash,
      salt,
      coin,
    ).context;
  }

  payInvoiceUnshielded(
    invoiceId: Uint8Array,
    amount: bigint,
    memoHash: Uint8Array,
    salt: Uint8Array,
  ): void {
    this.asPersona(PAYER_COIN_PUBLIC_KEY, DECOY_MERCHANT_SECRET_KEY);
    this.context = this.contract.impureCircuits.payInvoiceUnshielded(
      this.context,
      invoiceId,
      amount,
      memoHash,
      salt,
    ).context;
  }

  /** `merchantSecretKey` is overridable so INV-6 can be tested from the wrong key. */
  withdraw(invoiceId: Uint8Array, merchantSecretKey: Uint8Array = MERCHANT_SECRET_KEY): void {
    this.asPersona(MERCHANT_COIN_PUBLIC_KEY, merchantSecretKey);
    this.context = this.contract.impureCircuits.withdraw(this.context, invoiceId).context;
  }

  withdrawUnshielded(
    invoiceId: Uint8Array,
    to: { bytes: Uint8Array },
    merchantSecretKey: Uint8Array = MERCHANT_SECRET_KEY,
  ): void {
    this.asPersona(MERCHANT_COIN_PUBLIC_KEY, merchantSecretKey);
    this.context = this.contract.impureCircuits.withdrawUnshielded(
      this.context,
      invoiceId,
      to,
    ).context;
  }

  cancelInvoice(invoiceId: Uint8Array, merchantSecretKey: Uint8Array = MERCHANT_SECRET_KEY): void {
    this.asPersona(MERCHANT_COIN_PUBLIC_KEY, merchantSecretKey);
    this.context = this.contract.impureCircuits.cancelInvoice(this.context, invoiceId).context;
  }

  /**
   * Everything an on-chain observer can read, as one searchable string: the
   * decoded ledger, the runtime's own state dump, and the encoded state value.
   * Deliberately excludes the Zswap local state — that is the wallet's private
   * view, not public state (PRD §4.2).
   */
  publicStateDump(): string {
    const decoded = this.ledger();
    const plain = {
      paymentToken: decoded.paymentToken,
      invoiceCount: decoded.invoiceCount,
      paidCount: decoded.paidCount,
      invoices: [...decoded.invoices].map(([invoiceId, record]) => ({ invoiceId, ...record })),
      escrow: [...decoded.escrow].map(([invoiceId, coin]) => ({ invoiceId, ...coin })),
    };
    const stateValue = this.context.currentQueryContext.state.state;
    return [
      JSON.stringify(plain, jsonReplacer),
      stateValue.toString(),
      JSON.stringify(stateValue.encode(), jsonReplacer),
    ].join('\n');
  }

  /** Points the next call at one persona's Zswap key and merchant witness slot. */
  private asPersona(coinPublicKey: Uint8Array, merchantSecretKey: Uint8Array): void {
    this.context = {
      ...this.context,
      currentPrivateState: createTacitPayPrivateState(merchantSecretKey, PAYER_SECRET_KEY),
      currentZswapLocalState: {
        ...this.context.currentZswapLocalState,
        coinPublicKey: { bytes: coinPublicKey },
      },
    };
  }
}

/** Renders bigints and byte strings so they are greppable in the privacy sweep. */
const jsonReplacer = (_key: string, value: unknown): unknown => {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Uint8Array) return toHex(value);
  return value;
};
