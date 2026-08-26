const UNITS_PER_NIGHT = 1_000_000n;

export function formatAmount(amount: bigint, token = 'NIGHT') {
  const sign = amount < 0n ? '-' : '';
  const absolute = amount < 0n ? -amount : amount;
  const whole = absolute / UNITS_PER_NIGHT;
  // Trailing zeros carry no information — "2 tUSDM" reads better than
  // "2.000000 tUSDM"; partial fractions keep only their significant digits.
  const fraction = (absolute % UNITS_PER_NIGHT).toString().padStart(6, '0').replace(/0+$/u, '');
  const decimals = fraction.length > 0 ? `.${fraction}` : '';
  return `${sign}${whole.toLocaleString('en-US')}${decimals} ${token}`;
}

const HEX_TOKEN_TYPE = /^[0-9a-f]{64}$/iu;
const NATIVE_TOKEN_TYPE = '0'.repeat(64);

/**
 * Invoice links carry the token as either a keyword ("NIGHT") or the raw
 * 64-hex type. Raw hex is meaningless to people: map the network's payment
 * token to its display symbol, the native type to NIGHT, and anything else
 * to a shortened hash so it can never overflow a layout.
 */
export function displayToken(
  token: string,
  known?: { readonly paymentTokenType?: string; readonly tokenSymbol: string },
) {
  if (!HEX_TOKEN_TYPE.test(token)) return token;
  const normalized = token.toLowerCase();
  if (known?.paymentTokenType && normalized === known.paymentTokenType.toLowerCase()) {
    return known.tokenSymbol;
  }
  if (normalized === NATIVE_TOKEN_TYPE) return 'NIGHT';
  return truncateHash(token);
}

export function parseAmount(value: string) {
  const normalized = value.trim().replaceAll(',', '');
  if (!/^\d+(?:\.\d{1,6})?$/u.test(normalized)) {
    throw new Error('Enter a positive amount with up to 6 decimal places.');
  }

  const [whole = '0', fraction = ''] = normalized.split('.');
  const amount = BigInt(whole) * UNITS_PER_NIGHT + BigInt(fraction.padEnd(6, '0'));
  if (amount <= 0n) throw new Error('Amount must be positive');
  return amount;
}

export function formatDateTime(timestamp: number) {
  if (timestamp === 0) return 'No expiry';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp * 1000));
}

export function toUnixSeconds(dateTimeLocal: string) {
  if (!dateTimeLocal) return undefined;
  const milliseconds = new Date(dateTimeLocal).getTime();
  if (!Number.isFinite(milliseconds)) throw new Error('Choose a valid expiry.');
  return Math.floor(milliseconds / 1000);
}

export function truncateHash(value: string, visible = 6) {
  if (value.length <= visible * 2 + 1) return value;
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}
