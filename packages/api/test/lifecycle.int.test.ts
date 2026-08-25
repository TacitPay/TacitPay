import { describe, it } from 'vitest';

// The local devnet and funded genesis wallets arrive with the integration-test task.
// Setting TACITPAY_INT=1 exposes the intended ten-minute lifecycle without fake passes.
describe.skipIf(process.env.TACITPAY_INT !== '1')('TacitPay local lifecycle (PRD §11.3)', () => {
  it.todo('starts one merchant wallet and one payer wallet from distinct funded genesis seeds');
  it.todo(
    'deploys TacitPay and asserts paymentToken through queryContractState + ledger(state.data)',
  );
  it.todo(
    'creates an invoice and asserts OPEN plus the incremented invoice counter in the indexer',
  );
  it.todo('pays from the second wallet and asserts PAID plus escrow state in the indexer');
  it.todo(
    'withdraws as the merchant, asserts WITHDRAWN, and verifies the merchant wallet balance increased',
  );
});
