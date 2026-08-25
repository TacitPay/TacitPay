import { bytes32ToHex } from './bytes.js';
import type { HexBytes32 } from './types.js';

export const memoHash = async (memo: string): Promise<Uint8Array> => {
  if (typeof memo !== 'string') throw new TypeError('memo must be a string');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(memo));
  return new Uint8Array(digest);
};

export const memoHashHex = async (memo: string): Promise<HexBytes32> =>
  bytes32ToHex(await memoHash(memo), 'memoHash');
