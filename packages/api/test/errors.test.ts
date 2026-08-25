import { describe, expect, it } from 'vitest';

import {
  CIRCUIT_ASSERT_MESSAGES,
  INSUFFICIENT_DUST_MESSAGE,
  PROOF_SERVER_MESSAGE,
  TacitPayError,
  toTacitPayError,
} from '../src/index.js';

describe('Midnight error mapping', () => {
  it.each(CIRCUIT_ASSERT_MESSAGES)('preserves circuit assertion %s verbatim', (message) => {
    expect(toTacitPayError(new Error(`Compact assertion failed: ${message}`)).message).toBe(
      message,
    );
  });

  it('maps Wallet.InsufficientFunds to DUST guidance', () => {
    const error = { code: 'Wallet.InsufficientFunds', message: 'not enough fee tokens' };

    expect(toTacitPayError(error).message).toBe(INSUFFICIENT_DUST_MESSAGE);
  });

  it('maps proof-server connection failures to the PRD §12.4 pointer', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:6300');

    expect(toTacitPayError(error).message).toBe(PROOF_SERVER_MESSAGE);
  });

  it('retains an ordinary safe error message and cause', () => {
    const source = new Error('Indexer rejected the query');
    const mapped = toTacitPayError(source);

    expect(mapped).toBeInstanceOf(TacitPayError);
    expect(mapped.message).toBe(source.message);
    expect(mapped.cause).toBe(source);
  });
});
