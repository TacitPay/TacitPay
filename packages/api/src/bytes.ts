import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';

import { NIGHT_TOKEN_COLOR_HEX } from './constants.js';
import type { HexBytes32 } from './types.js';

const HEX_BYTES_32 = /^[0-9a-f]{64}$/i;

export const parseHexBytes32 = (value: string, label = 'value'): HexBytes32 => {
  if (!HEX_BYTES_32.test(value)) {
    throw new TypeError(`${label} must be exactly 32 bytes of hexadecimal`);
  }
  return value.toLowerCase();
};

export const bytes32FromHex = (value: string, label = 'value'): Uint8Array =>
  Uint8Array.from(fromHex(parseHexBytes32(value, label)));

export const bytes32ToHex = (value: Uint8Array, label = 'value'): HexBytes32 => {
  if (!(value instanceof Uint8Array) || value.length !== 32) {
    throw new TypeError(`${label} must be a 32-byte Uint8Array`);
  }
  return toHex(value);
};

export const randomBytes32 = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

export const tokenColorToLinkToken = (value: Uint8Array): 'NIGHT' | HexBytes32 => {
  const hex = bytes32ToHex(value, 'paymentToken');
  return hex === NIGHT_TOKEN_COLOR_HEX ? 'NIGHT' : hex;
};

export const linkTokenToHex = (value: 'NIGHT' | HexBytes32): HexBytes32 =>
  value === 'NIGHT' ? NIGHT_TOKEN_COLOR_HEX : parseHexBytes32(value, 'token');

export const equalBytes = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
};
