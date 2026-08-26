import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

import { InvoiceStatus } from '../../managed/tacitpay/contract/index.js';
import { witnesses } from '../witnesses';
import {
  bytes32,
  MERCHANT_COIN_PUBLIC_KEY,
  MERCHANT_SECRET_KEY,
  PAYER_COIN_PUBLIC_KEY,
  PAYER_SECRET_KEY,
  PAYMENT_TOKEN,
  shieldedCoin,
  TacitPaySimulator,
  toHex,
  DEFAULT_BLOCK_TIME_SECONDS,
} from './simulator.js';

// Scaffold sanity checks — replaced by real assertions as the contract lands.
describe('scaffold sanity', () => {
  it('contract source targets Compact language 0.23+ (PRD §6)', () => {
    const source = readFileSync(new URL('../../tacitpay.compact', import.meta.url), 'utf8');
    expect(source).toMatch(/pragma language_version >= 0\.23;/);
  });

  it('witness module exports the witnesses record (PRD §6.3)', () => {
    expect(witnesses).toBeTypeOf('object');
    expect(witnesses.merchantSecret).toBeTypeOf('function');
    expect(witnesses.payerSecret).toBeTypeOf('function');
  });
});

const INVOICE_ID = bytes32(0x11);
const OTHER_INVOICE_ID = bytes32(0x22);
const UNKNOWN_INVOICE_ID = bytes32(0x99);
const AMOUNT = 1000n;
const MEMO_HASH = bytes32(0x33);
const SALT = bytes32(0x44);
const MERCHANT_USER_ADDRESS = { bytes: bytes32(0xe5) };
const ZERO_BYTES_HEX = toHex(bytes32(0x00));

// Wave 1 unit matrix (PRD §11.2), run against the generated contract module in
// the pure-JS runtime. Assertion failures surface as CompactError with the
// message "failed assert: <text>", so substring matching on the exact PRD
// string is what these tests check.
describe('tacitpay contract — Wave 1 unit matrix (PRD §11.2)', () => {
  let sim: TacitPaySimulator;

  beforeEach(() => {
    sim = new TacitPaySimulator();
  });

  /** Creates an OPEN invoice and pays it with a matching coin. */
  const createAndPay = (invoiceId: Uint8Array = INVOICE_ID, expiresAt = 0n): void => {
    sim.createInvoice(invoiceId, AMOUNT, MEMO_HASH, SALT, expiresAt);
    sim.payInvoice(invoiceId, AMOUNT, MEMO_HASH, SALT, shieldedCoin(AMOUNT));
  };

  /** Creates an OPEN invoice and pays it from the public pool. */
  const createAndPayUnshielded = (invoiceId: Uint8Array = INVOICE_ID): void => {
    sim.createInvoice(invoiceId, AMOUNT, MEMO_HASH, SALT);
    sim.payInvoiceUnshielded(invoiceId, AMOUNT, MEMO_HASH, SALT);
  };

  it('U-01 createInvoice stores OPEN record with commitment and ownerTag set', () => {
    sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT, 1_800_000_000n);

    const state = sim.ledger();
    expect(state.invoiceCount).toBe(1n);
    expect(state.invoices.member(INVOICE_ID)).toBe(true);

    const record = state.invoices.lookup(INVOICE_ID);
    expect(record.status).toBe(InvoiceStatus.OPEN);
    expect(record.expiresAt).toBe(1_800_000_000n);
    expect(toHex(record.commitment)).not.toBe(ZERO_BYTES_HEX);
    expect(toHex(record.ownerTag)).not.toBe(ZERO_BYTES_HEX);
    // Nobody has paid yet, so the payer tag is still the zero default.
    expect(toHex(record.payerTag)).toBe(ZERO_BYTES_HEX);
  });

  it('U-02 createInvoice twice with same id throws "Invoice already exists"', () => {
    sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT);

    expect(() => sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT)).toThrow(
      'Invoice already exists',
    );
    expect(sim.ledger().invoiceCount).toBe(1n);
  });

  it('U-03 createInvoice with amount 0 throws "Amount must be positive"', () => {
    expect(() => sim.createInvoice(INVOICE_ID, 0n, MEMO_HASH, SALT)).toThrow(
      'Amount must be positive',
    );
    expect(sim.ledger().invoiceCount).toBe(0n);
  });

  it('U-04 two invoices by same merchant have different ownerTags (INV-2)', () => {
    sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT);
    sim.createInvoice(OTHER_INVOICE_ID, AMOUNT, MEMO_HASH, SALT);

    const state = sim.ledger();
    const first = state.invoices.lookup(INVOICE_ID);
    const second = state.invoices.lookup(OTHER_INVOICE_ID);
    // Same merchant secret, different invoice ids — the tags must not link.
    expect(toHex(first.ownerTag)).not.toBe(toHex(second.ownerTag));
    expect(state.invoiceCount).toBe(2n);
  });

  it('U-05 payInvoice with correct preimage + coin → PAID, escrow entry, payerTag', () => {
    createAndPay();

    const state = sim.ledger();
    const record = state.invoices.lookup(INVOICE_ID);
    expect(record.status).toBe(InvoiceStatus.PAID);
    expect(toHex(record.payerTag)).not.toBe(ZERO_BYTES_HEX);
    expect(state.paidCount).toBe(1n);

    // Variant A custody: the contract now holds the coin (PRD §6.5).
    expect(state.escrow.member(INVOICE_ID)).toBe(true);
    const escrowed = state.escrow.lookup(INVOICE_ID);
    expect(escrowed.value).toBe(AMOUNT);
    expect(toHex(escrowed.color)).toBe(toHex(PAYMENT_TOKEN));
  });

  it('U-06 payInvoice with wrong amount preimage throws "Invoice details do not match"', () => {
    sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT);

    expect(() =>
      sim.payInvoice(INVOICE_ID, AMOUNT + 1n, MEMO_HASH, SALT, shieldedCoin(AMOUNT + 1n)),
    ).toThrow('Invoice details do not match');
    expect(sim.ledger().invoices.lookup(INVOICE_ID).status).toBe(InvoiceStatus.OPEN);
  });

  it('U-07 payInvoice with coin.value ≠ amount throws "Wrong amount"', () => {
    sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT);

    // Preimage is correct, so the commitment check passes and the coin check fires.
    expect(() =>
      sim.payInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT, shieldedCoin(AMOUNT + 1n)),
    ).toThrow('Wrong amount');
    expect(sim.ledger().escrow.member(INVOICE_ID)).toBe(false);
  });

  it('U-08 payInvoice with wrong token colour throws "Wrong token"', () => {
    sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT);

    expect(() =>
      sim.payInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT, shieldedCoin(AMOUNT, bytes32(0x02))),
    ).toThrow('Wrong token');
    expect(sim.ledger().escrow.member(INVOICE_ID)).toBe(false);
  });

  it('U-09 payInvoice on PAID invoice throws "Invoice is not open" (INV-7)', () => {
    createAndPay();

    expect(() => sim.payInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT, shieldedCoin(AMOUNT))).toThrow(
      'Invoice is not open',
    );
    expect(sim.ledger().paidCount).toBe(1n);
  });

  it('U-10 payInvoice after expiry throws "Invoice expired" (INV-8)', () => {
    const expiresAt = BigInt(DEFAULT_BLOCK_TIME_SECONDS + 100);
    sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT, expiresAt);

    sim.setBlockTimeSeconds(DEFAULT_BLOCK_TIME_SECONDS + 200);
    expect(() => sim.payInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT, shieldedCoin(AMOUNT))).toThrow(
      'Invoice expired',
    );

    // Same call before the deadline succeeds — proves expiry is what rejected it.
    sim.setBlockTimeSeconds(DEFAULT_BLOCK_TIME_SECONDS + 10);
    sim.payInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT, shieldedCoin(AMOUNT));
    expect(sim.ledger().invoices.lookup(INVOICE_ID).status).toBe(InvoiceStatus.PAID);
  });

  it('U-11 payInvoice on unknown id throws "Unknown invoice"', () => {
    expect(() =>
      sim.payInvoice(UNKNOWN_INVOICE_ID, AMOUNT, MEMO_HASH, SALT, shieldedCoin(AMOUNT)),
    ).toThrow('Unknown invoice');
  });

  it('U-12 withdraw by owner after PAID → WITHDRAWN, escrow removed, Zswap output', () => {
    createAndPay();
    sim.withdraw(INVOICE_ID);

    const state = sim.ledger();
    const record = state.invoices.lookup(INVOICE_ID);
    expect(record.status).toBe(InvoiceStatus.WITHDRAWN);
    expect(state.escrow.member(INVOICE_ID)).toBe(false);
    // Other fields survive the status change.
    expect(toHex(record.payerTag)).not.toBe(ZERO_BYTES_HEX);

    // The coin left the contract towards the merchant's Zswap key (left = user).
    const merchantOutput = sim
      .zswapState()
      .outputs.find(
        (output) =>
          output.recipient.is_left &&
          toHex(output.recipient.left.bytes) === toHex(MERCHANT_COIN_PUBLIC_KEY),
      );
    expect(merchantOutput).toBeDefined();
    expect(merchantOutput?.coinInfo.value).toBe(AMOUNT);
  });

  it('U-13 withdraw by non-owner secret throws "Not the invoice owner" (INV-6)', () => {
    createAndPay();

    // Payer's secret in the merchant witness slot derives a different ownerTag.
    expect(() => sim.withdraw(INVOICE_ID, PAYER_SECRET_KEY)).toThrow('Not the invoice owner');
    expect(sim.ledger().escrow.member(INVOICE_ID)).toBe(true);
  });

  it('U-14 withdraw on OPEN invoice throws "Nothing to withdraw"', () => {
    sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT);

    expect(() => sim.withdraw(INVOICE_ID)).toThrow('Nothing to withdraw');
  });

  it('U-15 cancel by owner on OPEN → CANCELLED', () => {
    sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT);
    sim.cancelInvoice(INVOICE_ID);

    expect(sim.ledger().invoices.lookup(INVOICE_ID).status).toBe(InvoiceStatus.CANCELLED);
  });

  it('U-16 cancel on PAID throws', () => {
    createAndPay();

    expect(() => sim.cancelInvoice(INVOICE_ID)).toThrow('Only open invoices can be cancelled');
    expect(sim.ledger().invoices.lookup(INVOICE_ID).status).toBe(InvoiceStatus.PAID);
  });

  it('U-29 payInvoiceUnshielded with correct preimage → PAID, owed entry, payerTag, no escrow', () => {
    createAndPayUnshielded();

    const state = sim.ledger();
    const record = state.invoices.lookup(INVOICE_ID);
    expect(record.status).toBe(InvoiceStatus.PAID);
    expect(toHex(record.payerTag)).not.toBe(ZERO_BYTES_HEX);
    expect(state.paidCount).toBe(1n);

    // Public-pool custody records the disclosed amount without a shielded coin.
    expect(state.unshieldedOwed.member(INVOICE_ID)).toBe(true);
    expect(state.unshieldedOwed.lookup(INVOICE_ID)).toBe(AMOUNT);
    expect(state.escrow.member(INVOICE_ID)).toBe(false);
  });

  it('U-30 payInvoiceUnshielded with wrong amount preimage throws "Invoice details do not match"', () => {
    sim.createInvoice(INVOICE_ID, AMOUNT, MEMO_HASH, SALT);

    expect(() => sim.payInvoiceUnshielded(INVOICE_ID, AMOUNT + 1n, MEMO_HASH, SALT)).toThrow(
      'Invoice details do not match',
    );
    expect(sim.ledger().invoices.lookup(INVOICE_ID).status).toBe(InvoiceStatus.OPEN);
  });

  it('U-31 payInvoiceUnshielded on a PAID invoice throws "Invoice is not open"', () => {
    createAndPayUnshielded();

    expect(() => sim.payInvoiceUnshielded(INVOICE_ID, AMOUNT, MEMO_HASH, SALT)).toThrow(
      'Invoice is not open',
    );
    expect(sim.ledger().paidCount).toBe(1n);
  });

  it('U-32 withdrawUnshielded by owner after unshielded pay → WITHDRAWN, owed entry removed', () => {
    createAndPayUnshielded();
    sim.withdrawUnshielded(INVOICE_ID, MERCHANT_USER_ADDRESS);

    const state = sim.ledger();
    const record = state.invoices.lookup(INVOICE_ID);
    expect(record.status).toBe(InvoiceStatus.WITHDRAWN);
    expect(state.unshieldedOwed.member(INVOICE_ID)).toBe(false);
    // Other fields survive the status change.
    expect(toHex(record.payerTag)).not.toBe(ZERO_BYTES_HEX);
  });

  it('U-33 withdrawUnshielded by non-owner secret throws "Not the invoice owner"', () => {
    createAndPayUnshielded();

    expect(() =>
      sim.withdrawUnshielded(INVOICE_ID, MERCHANT_USER_ADDRESS, PAYER_SECRET_KEY),
    ).toThrow('Not the invoice owner');
    expect(sim.ledger().unshieldedOwed.member(INVOICE_ID)).toBe(true);
  });

  it('U-34 withdrawUnshielded on a shielded-paid invoice throws "Paid shielded - use withdraw"', () => {
    createAndPay();

    expect(() => sim.withdrawUnshielded(INVOICE_ID, MERCHANT_USER_ADDRESS)).toThrow(
      'Paid shielded - use withdraw',
    );
    expect(sim.ledger().escrow.member(INVOICE_ID)).toBe(true);
  });

  it('U-35 shielded withdraw on an unshielded-paid invoice throws "Paid unshielded - use withdrawUnshielded"', () => {
    createAndPayUnshielded();

    expect(() => sim.withdraw(INVOICE_ID)).toThrow('Paid unshielded - use withdrawUnshielded');
    expect(sim.ledger().unshieldedOwed.member(INVOICE_ID)).toBe(true);
  });

  it('U-36 payInvoiceUnshielded on unknown id throws "Unknown invoice"', () => {
    expect(() => sim.payInvoiceUnshielded(UNKNOWN_INVOICE_ID, AMOUNT, MEMO_HASH, SALT)).toThrow(
      'Unknown invoice',
    );
  });

  it('U-17 privacy: no amount/memo/secret bytes anywhere in serialized ledger state', () => {
    const memo = 'TacitPay invoice INV-001: consulting retainer';
    const memoHash = new Uint8Array(createHash('sha256').update(memo).digest());
    const amount = 123_456_789n;
    const salt = bytes32(0x7e);

    sim.createInvoice(INVOICE_ID, amount, memoHash, salt);
    sim.payInvoice(INVOICE_ID, amount, memoHash, salt, shieldedCoin(amount));
    sim.withdraw(INVOICE_ID);

    const dump = sim.publicStateDump();

    // The amount, in every encoding it could plausibly leak as (INV-1).
    const bigEndian = amount.toString(16).padStart(16, '0');
    const littleEndian = (bigEndian.match(/../g) ?? []).reverse().join('');
    expect(dump).not.toContain(amount.toString());
    expect(dump).not.toContain(bigEndian);
    expect(dump).not.toContain(littleEndian);
    expect(dump).not.toContain(amount.toString(16));

    // The memo, its hash, and the commitment randomness (INV-4).
    expect(dump).not.toContain(memo);
    expect(dump).not.toContain(toHex(memoHash));
    expect(dump).not.toContain(toHex(salt));

    // Neither party's Zswap coin public key (INV-2, INV-3). ownPublicKey() is
    // readable inside every circuit, so "we never write it" is exactly the kind
    // of claim that needs a test rather than an argument.
    expect(dump).not.toContain(toHex(PAYER_COIN_PUBLIC_KEY));
    expect(dump).not.toContain(toHex(MERCHANT_COIN_PUBLIC_KEY));

    // Neither party's root secret.
    expect(dump).not.toContain(toHex(MERCHANT_SECRET_KEY));
    expect(dump).not.toContain(toHex(PAYER_SECRET_KEY));

    // Sanity: the sweep is looking at real, populated state.
    const state = sim.ledger();
    expect(state.invoices.lookup(INVOICE_ID).status).toBe(InvoiceStatus.WITHDRAWN);
    expect(state.escrow.isEmpty()).toBe(true);
    expect(dump).toContain(toHex(state.invoices.lookup(INVOICE_ID).commitment));
  });

  // Companion to U-17. Variant A deliberately publishes the escrowed coin while
  // the contract holds it (PRD §6.5). Pinning that here keeps the exposure a
  // tracked, bounded limitation instead of an untested assumption: U-17 alone
  // sweeps only post-withdraw state and so cannot see this window at all.
  it('U-17b Variant A: escrowed amount is public between pay and withdraw (PRD §6.5)', () => {
    const amount = 123_456_789n;
    const salt = bytes32(0x7e);

    sim.createInvoice(INVOICE_ID, amount, MEMO_HASH, salt);
    sim.payInvoice(INVOICE_ID, amount, MEMO_HASH, salt, shieldedCoin(amount));

    const midFlight = sim.publicStateDump();
    // Known and accepted: the coin's value is readable while in custody.
    expect(midFlight).toContain(amount.toString());
    // Everything else stays hidden even during the exposure window.
    expect(midFlight).not.toContain(toHex(MEMO_HASH));
    expect(midFlight).not.toContain(toHex(salt));
    expect(midFlight).not.toContain(toHex(MERCHANT_SECRET_KEY));
    expect(midFlight).not.toContain(toHex(PAYER_SECRET_KEY));

    // Withdrawing closes the window in current state (history still records it).
    sim.withdraw(INVOICE_ID);
    expect(sim.publicStateDump()).not.toContain(amount.toString());
  });
});

// Wave 2/3 circuits (PRD §11.2, §15.5–15.6, §16.4). U-27 (series derivation)
// is api-layer and lives in packages/api/test.
describe('tacitpay contract — Wave 2/3 matrix (PRD §11.2)', () => {
  it.todo('U-18 proveReceipt by payer succeeds; by non-payer fails');
  it.todo('U-19 proveRevenueAtLeast ≥ threshold passes; below fails; foreign invoice fails');
  it.todo('U-20 milestone: withdraw before approveRelease and before releaseAfter throws (INV-9)');
  it.todo('U-21 milestone: approveRelease by payer, then withdraw → WITHDRAWN');
  it.todo('U-22 milestone: approveRelease by non-payer throws "Not the payer"');
  it.todo('U-23 milestone: withdraw after releaseAfter without approval (timeout) → WITHDRAWN');
  it.todo('U-24 refund: offerRefund by owner on PAID → REFUNDABLE; by non-owner throws');
  it.todo(
    'U-25 refund: claimRefund by payer → REFUNDED, escrow removed; by non-payer throws (INV-10)',
  );
  it.todo('U-26 refund: withdraw on REFUNDABLE throws; claimRefund on WITHDRAWN throws');
  it.todo('U-28 proveReceivablesAtLeast counts only OPEN, unexpired invoices');
});
