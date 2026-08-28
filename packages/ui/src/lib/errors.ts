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

export function getErrorMessage(error: unknown) {
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
  if (message && message !== '[object Object]') return message;
  return 'Something went wrong. Try again.';
}
