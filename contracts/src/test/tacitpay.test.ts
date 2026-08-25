import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { witnesses } from '../witnesses';

// Scaffold sanity checks — replaced by real assertions as the contract lands.
describe('scaffold sanity', () => {
  it('contract source targets Compact language 0.23+ (PRD §6)', () => {
    const source = readFileSync(new URL('../../tacitpay.compact', import.meta.url), 'utf8');
    expect(source).toMatch(/pragma language_version >= 0\.23;/);
  });

  it('witness module exports the witnesses record (PRD §6.3)', () => {
    expect(witnesses).toBeTypeOf('object');
  });
});

// Wave 1 unit matrix (PRD §11.2) — pre-registered so progress is visible in
// every test run. Each todo becomes a real simulation test against the
// generated contract module (new Contract(witnesses), impureCircuits.*).
describe('tacitpay contract — Wave 1 unit matrix (PRD §11.2)', () => {
  it.todo('U-01 createInvoice stores OPEN record with commitment and ownerTag set');
  it.todo('U-02 createInvoice twice with same id throws "Invoice already exists"');
  it.todo('U-03 createInvoice with amount 0 throws "Amount must be positive"');
  it.todo('U-04 two invoices by same merchant have different ownerTags (INV-2)');
  it.todo('U-05 payInvoice with correct preimage + coin → PAID, escrow entry, payerTag');
  it.todo('U-06 payInvoice with wrong amount preimage throws "Invoice details do not match"');
  it.todo('U-07 payInvoice with coin.value ≠ amount throws "Wrong amount"');
  it.todo('U-08 payInvoice with wrong token colour throws "Wrong token"');
  it.todo('U-09 payInvoice on PAID invoice throws "Invoice is not open" (INV-7)');
  it.todo('U-10 payInvoice after expiry throws "Invoice expired" (INV-8)');
  it.todo('U-11 payInvoice on unknown id throws "Unknown invoice"');
  it.todo('U-12 withdraw by owner after PAID → WITHDRAWN, escrow removed, Zswap output');
  it.todo('U-13 withdraw by non-owner secret throws "Not the invoice owner" (INV-6)');
  it.todo('U-14 withdraw on OPEN invoice throws "Nothing to withdraw"');
  it.todo('U-15 cancel by owner on OPEN → CANCELLED');
  it.todo('U-16 cancel on PAID throws');
  it.todo('U-17 privacy: no amount/memo/secret bytes anywhere in serialized ledger state');
});
