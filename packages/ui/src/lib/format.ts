const UNITS_PER_NIGHT = 1_000_000n;

export const EXPLORER_URL = 'https://preview.midnightexplorer.com/';

export function formatAmount(amount: bigint, token = 'NIGHT') {
  const sign = amount < 0n ? '-' : '';
  const absolute = amount < 0n ? -amount : amount;
  const whole = absolute / UNITS_PER_NIGHT;
  const fraction = (absolute % UNITS_PER_NIGHT).toString().padStart(6, '0');
  return `${sign}${whole.toLocaleString('en-US')}.${fraction} ${token}`;
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
