import { describe, expect, it } from 'vitest';

import {
  createMerchantPrivateState,
  createPayerPrivateState,
  type MerchantInvoiceRecord,
  type PayerReceiptRecord,
} from '../src/index.js';

const secret = (): Uint8Array => Uint8Array.from({ length: 32 }, (_, index) => index);

describe('private-state records', () => {
  it('creates the merchant shape from PRD §7.1 without sharing key memory', () => {
    const input = secret();
    const state = createMerchantPrivateState(input);

    expect(state).toEqual({ secretKey: input, invoices: {} });
    expect(state.secretKey).not.toBe(input);
  });

  it('creates the payer shape from PRD §7.2 without sharing key memory', () => {
    const input = secret();
    const state = createPayerPrivateState(input);

    expect(state).toEqual({ secretKey: input, receipts: {} });
    expect(state.secretKey).not.toBe(input);
  });

  it('types the complete merchant invoice record', () => {
    const record: MerchantInvoiceRecord = {
      amount: 1_250_000n,
      memo: 'Logo design',
      memoHash: '01'.repeat(32),
      salt: '02'.repeat(32),
      expiresAt: 0,
      createdAt: 1_727_000_000,
      status: 'OPEN',
      txIds: { created: 'tx-create' },
    };

    expect(record.amount).toBeTypeOf('bigint');
    expect(record.txIds.created).toBe('tx-create');
  });

  it('types the complete payer receipt record', () => {
    const receipt: PayerReceiptRecord = {
      contractAddress: 'ab'.repeat(32),
      amount: 1_250_000n,
      memoHash: '01'.repeat(32),
      salt: '02'.repeat(32),
      memo: 'Logo design',
      paidAt: 1_727_000_100,
      txId: 'tx-pay',
    };

    expect(receipt.amount).toBeTypeOf('bigint');
    expect(receipt.txId).toBe('tx-pay');
  });

  it('rejects keys that are not exactly 32 bytes', () => {
    expect(() => createMerchantPrivateState(new Uint8Array(31))).toThrowError('32-byte');
    expect(() => createPayerPrivateState(new Uint8Array(33))).toThrowError('32-byte');
  });
});
