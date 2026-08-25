import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import { decodeLink, encodeLink, InvoiceLinkError, type InvoiceLinkPayload } from '../src/index.js';

const CONTRACT = 'ab'.repeat(32);
const OTHER_CONTRACT = 'cd'.repeat(32);

const payload = (): InvoiceLinkPayload => ({
  v: 1,
  net: 'preview',
  contract: CONTRACT,
  id: '01'.repeat(32),
  amount: '1250000',
  token: 'NIGHT',
  memo: 'Logo design – final',
  salt: '02'.repeat(32),
  exp: 1_727_000_000,
});

const validation = {
  network: 'preview' as const,
  contractAddress: CONTRACT,
  paymentToken: 'NIGHT' as const,
};

const rawFragment = (value: unknown): string =>
  `#${Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')}`;

describe('invoice link codec', () => {
  it('round-trips canonical base64url JSON, including Unicode memo text', () => {
    const encoded = encodeLink(payload());

    expect(encoded).toMatch(/^#[A-Za-z0-9_-]+$/);
    expect(decodeLink(encoded, validation)).toEqual(payload());
  });

  it('accepts the fragment from a full client-side URL', () => {
    const link = `https://pay.tacitpay.test/pay${encodeLink(payload())}`;

    expect(decodeLink(link, validation).id).toBe(payload().id);
  });

  it.each([
    ['', 'missing'],
    ['#not+base64', 'base64url'],
    [rawFragment('not an object'), 'object'],
    [rawFragment({ ...payload(), extra: true }), 'unexpected field'],
    [rawFragment({ ...payload(), v: 2 }), 'version'],
    [rawFragment({ ...payload(), id: '01' }), 'id'],
    [rawFragment({ ...payload(), amount: '0' }), 'amount'],
    [rawFragment({ ...payload(), amount: '01' }), 'amount'],
    [rawFragment({ ...payload(), token: 'USDM' }), 'token'],
    [rawFragment({ ...payload(), exp: 1.5 }), 'exp'],
  ])('rejects malformed attacker input %#', (link, message) => {
    expect(() => decodeLink(link, validation)).toThrowError(message);
  });

  it('rejects a valid payload for another network', () => {
    const link = encodeLink({ ...payload(), net: 'preprod' });

    expect(() => decodeLink(link, validation)).toThrowError('network');
  });

  it('rejects a valid payload for another contract', () => {
    const link = encodeLink({ ...payload(), contract: OTHER_CONTRACT });

    expect(() => decodeLink(link, validation)).toThrowError('contract');
  });

  it('rejects a token tamper before a payment circuit is built', () => {
    const link = encodeLink({ ...payload(), token: '03'.repeat(32) });

    expect(() => decodeLink(link, validation)).toThrowError('token');
  });

  it('uses a dedicated validation error type', () => {
    expect(() => decodeLink('#%', validation)).toThrowError(InvoiceLinkError);
  });
});
