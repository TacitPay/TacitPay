export const CIRCUIT_ASSERT_MESSAGES = [
  'Invoice already exists',
  'Amount must be positive',
  'Unknown invoice',
  'Invoice is not open',
  'Invoice expired',
  'Invoice details do not match',
  'Wrong token',
  'Wrong amount',
  'Nothing to withdraw',
  'Not the invoice owner',
  'Only open invoices can be cancelled',
] as const;

export const INSUFFICIENT_DUST_MESSAGE =
  'Your wallet has NIGHT but no DUST yet; register for DUST and wait for a spendable coin';

export const PROOF_SERVER_MESSAGE =
  'Cannot reach the proof server. Start it on http://127.0.0.1:6300 and see PRD §12.4.';

export const ACQUIRE_TOKENS_URL = 'https://docs.midnight.network/guides/acquire-tokens';

export class TacitPayError extends Error {
  override readonly name = 'TacitPayError';

  constructor(
    message: string,
    readonly code: 'circuit' | 'insufficient-dust' | 'proof-server' | 'midnight',
    readonly helpUrl: string | undefined,
    cause: unknown,
  ) {
    super(message, { cause });
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const collectErrorText = (value: unknown, depth = 0): string[] => {
  if (depth > 4) return [];
  if (typeof value === 'string') return [value];
  if (!isRecord(value)) return [];

  const result: string[] = [];
  for (const key of ['name', 'code', 'message', '_tag'] as const) {
    if (typeof value[key] === 'string') result.push(value[key]);
  }
  if ('cause' in value && value.cause !== value) {
    result.push(...collectErrorText(value.cause, depth + 1));
  }
  return result;
};

export const toTacitPayError = (error: unknown): TacitPayError => {
  if (error instanceof TacitPayError) return error;
  const text = collectErrorText(error).join(' | ');

  const circuitMessage = CIRCUIT_ASSERT_MESSAGES.find((message) => text.includes(message));
  if (circuitMessage !== undefined) {
    return new TacitPayError(circuitMessage, 'circuit', undefined, error);
  }

  if (/Wallet\.InsufficientFunds|insufficient.?funds/iu.test(text)) {
    return new TacitPayError(
      INSUFFICIENT_DUST_MESSAGE,
      'insufficient-dust',
      ACQUIRE_TOKENS_URL,
      error,
    );
  }

  if (
    /(proof|prove|proving|6300).*(ECONNREFUSED|fetch failed|connect|unavailable)|(ECONNREFUSED|fetch failed).*(6300|proof)/iu.test(
      text,
    )
  ) {
    return new TacitPayError(PROOF_SERVER_MESSAGE, 'proof-server', undefined, error);
  }

  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : 'Midnight operation failed';
  return new TacitPayError(message, 'midnight', undefined, error);
};
