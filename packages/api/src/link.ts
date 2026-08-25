import { MAX_UINT64 } from './constants.js';
import { bytes32ToHex, linkTokenToHex, parseHexBytes32 } from './bytes.js';
import type { InvoiceLinkPayload, LinkValidationContext, NetworkId } from './types.js';

const LINK_FIELDS = ['v', 'net', 'contract', 'id', 'amount', 'token', 'memo', 'salt', 'exp'];
const NETWORK_IDS: readonly NetworkId[] = ['undeployed', 'preview', 'preprod', 'mainnet'];
const MAX_FRAGMENT_LENGTH = 16_384;
const MAX_MEMO_BYTES = 4_096;

export class InvoiceLinkError extends Error {
  override readonly name = 'InvoiceLinkError';
}

const fail = (message: string): never => {
  throw new InvoiceLinkError(`Invalid invoice link: ${message}`);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireExactFields = (value: Record<string, unknown>): void => {
  const keys = Object.keys(value);
  for (const key of keys) {
    if (!LINK_FIELDS.includes(key)) fail(`unexpected field "${key}"`);
  }
  for (const key of LINK_FIELDS) {
    if (!Object.hasOwn(value, key)) fail(`missing field "${key}"`);
  }
};

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') return fail(`${field} must be a string`);
  return value;
};

const parseNetwork = (value: unknown): NetworkId => {
  const network = requireString(value, 'network');
  if (!NETWORK_IDS.includes(network as NetworkId)) fail('network is not supported');
  return network as NetworkId;
};

const parseDecimalAmount = (value: unknown): string => {
  const amount = requireString(value, 'amount');
  if (!/^[1-9]\d*$/.test(amount) || BigInt(amount) > MAX_UINT64) {
    fail('amount must be a positive canonical Uint<64> decimal');
  }
  return amount;
};

const parseExpiry = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    return fail('exp must be a non-negative safe integer');
  }
  return value;
};

const parseToken = (value: unknown): InvoiceLinkPayload['token'] => {
  const token = requireString(value, 'token');
  if (token === 'NIGHT') return token;
  try {
    return parseHexBytes32(token, 'token');
  } catch {
    return fail('token must be NIGHT or a 32-byte colour');
  }
};

const parseMemo = (value: unknown): string => {
  const memo = requireString(value, 'memo');
  if (new TextEncoder().encode(memo).length > MAX_MEMO_BYTES) {
    fail(`memo exceeds ${MAX_MEMO_BYTES} UTF-8 bytes`);
  }
  return memo;
};

const parsePayload = (value: unknown): InvoiceLinkPayload => {
  if (!isRecord(value)) return fail('payload must be an object');
  requireExactFields(value);
  if (value.v !== 1) fail('version must be 1');

  try {
    return {
      v: 1,
      net: parseNetwork(value.net),
      contract: parseHexBytes32(requireString(value.contract, 'contract'), 'contract'),
      id: parseHexBytes32(requireString(value.id, 'id'), 'id'),
      amount: parseDecimalAmount(value.amount),
      token: parseToken(value.token),
      memo: parseMemo(value.memo),
      salt: parseHexBytes32(requireString(value.salt, 'salt'), 'salt'),
      exp: parseExpiry(value.exp),
    };
  } catch (error) {
    if (error instanceof InvoiceLinkError) throw error;
    return fail(error instanceof Error ? error.message : 'payload validation failed');
  }
};

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

const fromBase64Url = (fragment: string): string => {
  if (!/^[A-Za-z0-9_-]+$/.test(fragment)) return fail('fragment is not base64url');
  const padded = fragment
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(fragment.length + ((4 - (fragment.length % 4)) % 4), '=');
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return fail('fragment is not valid base64url UTF-8');
  }
};

const getFragment = (link: string): string => {
  if (typeof link !== 'string' || link.length === 0) return fail('fragment is missing');
  if (link !== link.trim()) return fail('surrounding whitespace is not allowed');
  const hashIndex = link.indexOf('#');
  const fragment = hashIndex === -1 ? link : link.slice(hashIndex + 1);
  if (fragment.length === 0) return fail('fragment is missing');
  if (fragment.includes('#')) return fail('fragment contains an unexpected separator');
  if (fragment.length > MAX_FRAGMENT_LENGTH) return fail('fragment is too large');
  return fragment;
};

const validateContext = (payload: InvoiceLinkPayload, expected: LinkValidationContext): void => {
  if (payload.net !== expected.network) {
    fail(`network does not match configured network ${expected.network}`);
  }
  const contract = parseHexBytes32(expected.contractAddress, 'configured contract');
  if (payload.contract !== contract) fail('contract does not match configured contract');

  if (expected.paymentToken !== undefined) {
    const expectedHex =
      expected.paymentToken instanceof Uint8Array
        ? bytes32ToHex(expected.paymentToken, 'configured payment token')
        : linkTokenToHex(expected.paymentToken);
    if (linkTokenToHex(payload.token) !== expectedHex) {
      fail('token does not match configured payment token');
    }
  }
};

export const encodeLink = (payload: InvoiceLinkPayload): string =>
  `#${toBase64Url(JSON.stringify(parsePayload(payload)))}`;

export const decodeLink = (link: string, expected: LinkValidationContext): InvoiceLinkPayload => {
  const fragment = getFragment(link);
  let decoded: unknown;
  try {
    decoded = JSON.parse(fromBase64Url(fragment));
  } catch (error) {
    if (error instanceof InvoiceLinkError) throw error;
    return fail('fragment does not contain valid JSON');
  }
  const payload = parsePayload(decoded);
  validateContext(payload, expected);
  return payload;
};
