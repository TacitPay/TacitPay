import { randomBytes32 } from './bytes.js';
import type { MerchantPrivateState, PayerPrivateState } from './types.js';

const copySecretKey = (secretKey: Uint8Array): Uint8Array => {
  if (!(secretKey instanceof Uint8Array) || secretKey.length !== 32) {
    throw new TypeError('private state requires a 32-byte secret key');
  }
  return Uint8Array.from(secretKey);
};

export const createMerchantPrivateState = (
  secretKey: Uint8Array = randomBytes32(),
): MerchantPrivateState => ({
  secretKey: copySecretKey(secretKey),
  invoices: {},
});

export const createPayerPrivateState = (
  secretKey: Uint8Array = randomBytes32(),
): PayerPrivateState => ({
  secretKey: copySecretKey(secretKey),
  receipts: {},
});

export const isMerchantPrivateState = (
  state: MerchantPrivateState | PayerPrivateState,
): state is MerchantPrivateState => 'invoices' in state;

export const isPayerPrivateState = (
  state: MerchantPrivateState | PayerPrivateState,
): state is PayerPrivateState => 'receipts' in state;
