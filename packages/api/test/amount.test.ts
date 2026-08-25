import { describe, expect, it } from 'vitest';

import { formatAmount, memoHashHex, parseAmount } from '../src/index.js';

describe('smallest-unit amounts', () => {
  it.each([
    [0n, '0.000000'],
    [1n, '0.000001'],
    [1_250_000n, '1.250000'],
    [12_345_678_901n, '12345.678901'],
  ])('formats %s with the six token decimals from PRD §7.4', (amount, formatted) => {
    expect(formatAmount(amount)).toBe(formatted);
  });

  it.each([
    ['0', 0n],
    ['1', 1_000_000n],
    ['1.25', 1_250_000n],
    ['0.000001', 1n],
  ])('parses %s without floating-point arithmetic', (formatted, amount) => {
    expect(parseAmount(formatted)).toBe(amount);
  });

  it.each(['', '-1', '+1', '1e6', '1.0000001', '.5', '01'])('rejects %s', (value) => {
    expect(() => parseAmount(value)).toThrowError('amount');
  });
});

describe('memoHash', () => {
  it('uses SHA-256 over the UTF-8 memo bytes', async () => {
    await expect(memoHashHex('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
