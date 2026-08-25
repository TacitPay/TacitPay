import { TOKEN_DECIMALS } from './constants.js';

const requireDecimals = (decimals: number): void => {
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 30) {
    throw new RangeError('amount decimals must be an integer from 0 through 30');
  }
};

export const formatAmount = (amount: bigint, decimals = TOKEN_DECIMALS): string => {
  requireDecimals(decimals);
  if (amount < 0n) throw new RangeError('amount cannot be negative');
  if (decimals === 0) return amount.toString();

  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimals, '0');
  return `${whole}.${fraction}`;
};

export const parseAmount = (value: string, decimals = TOKEN_DECIMALS): bigint => {
  requireDecimals(decimals);
  const pattern = decimals === 0 ? /^(0|[1-9]\d*)$/ : /^(0|[1-9]\d*)(?:\.(\d+))?$/;
  const match = pattern.exec(value);
  if (match === null) throw new TypeError('amount must be a canonical non-negative decimal');

  const fraction = match[2] ?? '';
  if (fraction.length > decimals) {
    throw new RangeError(`amount supports at most ${decimals} decimal places`);
  }
  const scale = 10n ** BigInt(decimals);
  return BigInt(match[1]) * scale + BigInt(fraction.padEnd(decimals, '0') || '0');
};
