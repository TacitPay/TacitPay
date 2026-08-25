import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

import type { Ledger, Witnesses } from '../managed/tacitpay/contract/index.js';

// Witness implementations (PRD §6.3). The generated contract calls these from
// TypeScript and expects a [newPrivateState, value] tuple back; neither witness
// mutates state, so both return the private state unchanged.

/**
 * Private state backing both roles (PRD §7.1, §7.2). A single record carries
 * both secrets so one simulator/DApp instance can act as merchant or payer; a
 * real deployment keeps only the secret for the role it plays.
 */
export type TacitPayPrivateState = {
  /** 32-byte merchant root secret — never leaves the client. */
  readonly merchantSecretKey: Uint8Array;
  /** 32-byte payer root secret — never leaves the client. */
  readonly payerSecretKey: Uint8Array;
};

export const createTacitPayPrivateState = (
  merchantSecretKey: Uint8Array,
  payerSecretKey: Uint8Array,
): TacitPayPrivateState => ({ merchantSecretKey, payerSecretKey });

/**
 * Fails loudly here rather than deep inside the runtime's Bytes<32> marshalling,
 * where the error would not name the witness that supplied the bad key.
 */
const requireSecretKey = (name: string, key: Uint8Array | undefined): Uint8Array => {
  if (!(key instanceof Uint8Array) || key.length !== 32) {
    throw new Error(`${name}: private state must carry a 32-byte key`);
  }
  return key;
};

export const witnesses: Witnesses<TacitPayPrivateState> = {
  merchantSecret: ({
    privateState,
  }: WitnessContext<Ledger, TacitPayPrivateState>): [TacitPayPrivateState, Uint8Array] => [
    privateState,
    requireSecretKey('merchantSecret', privateState.merchantSecretKey),
  ],

  payerSecret: ({
    privateState,
  }: WitnessContext<Ledger, TacitPayPrivateState>): [TacitPayPrivateState, Uint8Array] => [
    privateState,
    requireSecretKey('payerSecret', privateState.payerSecretKey),
  ],
};
