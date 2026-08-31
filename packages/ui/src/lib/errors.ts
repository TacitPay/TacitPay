const CIRCUIT_MESSAGES = new Set([
  'Invoice is not open',
  'Wrong amount',
  'Wrong token',
  'Invoice details do not match',
  'Unknown invoice',
  'Invoice expired',
  'Nothing to withdraw',
  'Only open invoices can be cancelled',
  'Not the invoice owner',
  'Amount must be positive',
]);

const FALLBACK_MESSAGE = 'Something went wrong. Try again.';

export function getErrorMessage(error: unknown, depth = 0): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Wallet.InsufficientFunds')) {
    return 'Your wallet has the invoice token but no DUST yet; register for DUST and wait for a spendable coin';
  }
  if (/proof server|ECONNREFUSED|failed to fetch|networkerror/iu.test(message)) {
    return 'The proof server is unreachable. Start it at localhost:6300 and try again.';
  }
  if (/reject|denied|cancelled by user/iu.test(message)) {
    return 'The wallet connection request was rejected. You can try again when ready.';
  }
  // A wrong private-state passphrase surfaces as WebCrypto's opaque
  // OperationError ("operation failed for an operation-specific reason",
  // cause "Cipher job failed") when the level provider decrypts existing
  // records — verified directly against the provider package. The other
  // patterns are the provider's own decrypt-failure vocabulary.
  if (
    (error instanceof Error && error.name === 'OperationError') ||
    /bad decrypt|salt mismatch|invalid tag|unable to authenticate|cipher job failed|operation-specific reason/iu.test(
      message,
    )
  ) {
    return "That passphrase doesn't open this device's records — they were sealed with a different one. Enter the passphrase you set here before; it cannot be recovered.";
  }
  if (CIRCUIT_MESSAGES.has(message)) return message;
  // midnight-js wraps prove/balance/submit failures in a scoped-transaction
  // message and stringifies the underlying error, so a bare Error arrives as
  // "...: Error" with the truth (if any) riding on error.cause. Unwrap the
  // chain; when it ends blank, name the usual suspect (fee DUST) instead of
  // parroting the wrapper. Depth-capped in case a cause chain ever cycles.
  if (/Unexpected error (?:submitting|executing) scoped transaction/iu.test(message) && depth < 4) {
    const cause = error instanceof Error ? error.cause : undefined;
    const unwrapped =
      cause === undefined || cause === null ? null : getErrorMessage(cause, depth + 1);
    if (unwrapped !== null && unwrapped !== 'Error' && unwrapped !== FALLBACK_MESSAGE) {
      return unwrapped;
    }
    return "The wallet could not complete the transaction and gave no reason. The usual cause is no DUST for the network fee: check this wallet's DUST balance and that it is fully synced, then try again.";
  }
  if (message && message !== '[object Object]') return message;
  return FALLBACK_MESSAGE;
}
