import { Buffer } from 'node:buffer';
import { createHash, pbkdf2Sync } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Ledger } from '@tacitpay/contracts/managed/tacitpay/contract';
import { describe, expect, it } from 'vitest';

import type { TacitPayProviders } from '../src/index.js';
import type { FundableWallet } from './local-wallet.js';

// Imported dynamically because the WASM-backed runtime must resolve to a single
// instance before the contract module loads — see the `resolutions` entry for
// onchain-runtime-v3 in the root package.json.
const { InvoiceStatus, ledger } = await import('@tacitpay/contracts/managed/tacitpay/contract');
const {
  NIGHT_TOKEN_COLOR,
  bytes32FromHex,
  createTacitPayApi,
  isMerchantPrivateState,
  isPayerPrivateState,
} = await import('../src/index.js');
const { createNodeProviders } = await import('../src/providers/node.js');
const { fundLocalWallets, nativeBalances, openFundableWallet, waitForNativeBalances } =
  await import('./local-wallet.js');

const LOCAL_NETWORK = {
  networkId: 'undeployed' as const,
  nodeUrl: 'ws://127.0.0.1:9944',
  indexerHttpUrl: 'http://127.0.0.1:8088/api/v4/graphql',
  indexerWsUrl: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  proofServerUrl: 'http://127.0.0.1:6300',
};
const WALLET_FUNDING = 50_000n * 1_000_000n;
const INVOICE_AMOUNT = 12_345_678_901n;
const INVOICE_MEMO = 'tacitpay-int-private-memo-2026-08-24';
const TEST_TIMEOUT = 30 * 60 * 1_000;
const INDEXER_TIMEOUT = 5 * 60 * 1_000;

const seedFor = (role: 'merchant' | 'payer'): string =>
  createHash('sha256').update(`tacitpay-wave-1-integration:${role}`).digest('hex');

const storagePassword = (seed: string, accountId: string): string => {
  const digest = pbkdf2Sync(seed, `tacitpay:int:${accountId}`, 210_000, 32, 'sha256').toString(
    'hex',
  );
  return `Tp!9${digest}`;
};

const runStep = async <T>(name: string, operation: () => Promise<T>): Promise<T> => {
  console.info(`[TacitPay integration] ${name}`);
  try {
    return await operation();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${name} failed: ${detail}`, { cause: error });
  }
};

const readLedger = async (
  providers: TacitPayProviders,
  contractAddress: string,
): Promise<Ledger> => {
  const state = await providers.publicDataProvider.queryContractState(contractAddress);
  if (state === null) throw new Error(`Indexer has no state for contract ${contractAddress}`);
  return ledger(state.data);
};

const waitForLedger = async (
  providers: TacitPayProviders,
  contractAddress: string,
  reason: string,
  predicate: (publicLedger: Ledger) => boolean,
): Promise<Ledger> => {
  const deadline = Date.now() + INDEXER_TIMEOUT;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const publicLedger = await readLedger(providers, contractAddress);
      if (predicate(publicLedger)) return publicLedger;
    } catch (error) {
      lastError = error;
    }
    // Polling is deliberate: transaction submission and indexer visibility are asynchronous.
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  const suffix = lastError instanceof Error ? ` Last indexer error: ${lastError.message}` : '';
  throw new Error(`Indexer did not show ${reason} within ${INDEXER_TIMEOUT}ms.${suffix}`);
};

const isZero = (value: Uint8Array): boolean => value.every((byte) => byte === 0);
const toHex = (value: Uint8Array): string => Buffer.from(value).toString('hex');

const dumpPublicLedger = (publicLedger: Ledger): string =>
  JSON.stringify({
    paymentToken: toHex(publicLedger.paymentToken),
    invoices: [...publicLedger.invoices].map(([invoiceId, invoice]) => ({
      invoiceId: toHex(invoiceId),
      ownerTag: toHex(invoice.ownerTag),
      commitment: toHex(invoice.commitment),
      status: invoice.status,
      expiresAt: invoice.expiresAt.toString(),
      payerTag: toHex(invoice.payerTag),
    })),
    escrow: [...publicLedger.escrow].map(([invoiceId, coin]) => ({
      invoiceId: toHex(invoiceId),
      nonce: toHex(coin.nonce),
      color: toHex(coin.color),
      value: coin.value.toString(),
      mtIndex: coin.mt_index.toString(),
    })),
    invoiceCount: publicLedger.invoiceCount.toString(),
    paidCount: publicLedger.paidCount.toString(),
  });

describe.skipIf(process.env.TACITPAY_INT !== '1')('TacitPay local lifecycle (PRD §11.3)', () => {
  it(
    'moves real NIGHT through create, pay, and withdraw without exposing private inputs',
    async () => {
      const merchantSeed = seedFor('merchant');
      const payerSeed = seedFor('payer');
      const privateStateRoot = await mkdtemp(join(tmpdir(), 'tacitpay-int-'));
      const originalWorkingDirectory = process.cwd();
      let merchantWallet: FundableWallet | undefined;
      let payerWallet: FundableWallet | undefined;

      try {
        // Keep the SDK's default LevelDB private state outside the repository.
        process.chdir(privateStateRoot);
        const setup = await runStep(
          'Step 0 — fund two wallets and wait for spendable DUST',
          async () => {
            merchantWallet = await openFundableWallet(LOCAL_NETWORK, merchantSeed);
            payerWallet = await openFundableWallet(LOCAL_NETWORK, payerSeed);
            const funding = await fundLocalWallets(
              LOCAL_NETWORK,
              [
                {
                  label: 'merchant',
                  wallet: merchantWallet,
                  unshielded: WALLET_FUNDING,
                  shielded: 0n,
                },
                {
                  label: 'payer',
                  wallet: payerWallet,
                  unshielded: WALLET_FUNDING,
                  shielded: WALLET_FUNDING,
                },
              ],
              12 * 60 * 1_000,
            );
            expect(funding.recipients).toHaveLength(2);
            for (const recipient of funding.recipients) {
              expect(recipient.balances.dust, `${recipient.label} DUST balance`).toBeGreaterThan(
                0n,
              );
              expect(
                recipient.balances.spendableDustCoins,
                `${recipient.label} spendable DUST coins`,
              ).toBeGreaterThan(0);
            }
            return { merchantWallet, payerWallet };
          },
        );

        const merchantProviders = createNodeProviders({
          networkId: LOCAL_NETWORK.networkId,
          accountId: setup.merchantWallet.context.accountId,
          privateStoragePasswordProvider: () =>
            storagePassword(merchantSeed, setup.merchantWallet.context.accountId),
          indexerHttpUrl: LOCAL_NETWORK.indexerHttpUrl,
          indexerWsUrl: LOCAL_NETWORK.indexerWsUrl,
          proofServerUrl: LOCAL_NETWORK.proofServerUrl,
          walletContext: setup.merchantWallet.context,
        });
        const payerProviders = createNodeProviders({
          networkId: LOCAL_NETWORK.networkId,
          accountId: setup.payerWallet.context.accountId,
          privateStoragePasswordProvider: () =>
            storagePassword(payerSeed, setup.payerWallet.context.accountId),
          indexerHttpUrl: LOCAL_NETWORK.indexerHttpUrl,
          indexerWsUrl: LOCAL_NETWORK.indexerWsUrl,
          proofServerUrl: LOCAL_NETWORK.proofServerUrl,
          walletContext: setup.payerWallet.context,
        });

        const merchantApi = await runStep('Step 1 — deploy NIGHT contract', async () => {
          const api = await createTacitPayApi({
            providers: merchantProviders,
            role: 'merchant',
            paymentToken: NIGHT_TOKEN_COLOR,
          });
          expect(api.contractAddress).toMatch(/^[0-9a-f]{64}$/u);
          const publicLedger = await readLedger(merchantProviders, api.contractAddress);
          expect(publicLedger.paymentToken).toEqual(NIGHT_TOKEN_COLOR);
          return api;
        });

        const created = await runStep(
          'Step 2 — create OPEN invoice and read indexer state',
          async () => {
            const invoice = await merchantApi.createInvoice({
              amount: INVOICE_AMOUNT,
              memo: INVOICE_MEMO,
            });
            const invoiceIdBytes = bytes32FromHex(invoice.invoiceId, 'invoiceId');
            const publicLedger = await waitForLedger(
              merchantProviders,
              merchantApi.contractAddress,
              'an OPEN invoice',
              (candidate) =>
                candidate.invoices.member(invoiceIdBytes) &&
                candidate.invoices.lookup(invoiceIdBytes).status === InvoiceStatus.OPEN,
            );
            const record = publicLedger.invoices.lookup(invoiceIdBytes);
            expect(record.status).toBe(InvoiceStatus.OPEN);
            expect(isZero(record.commitment), 'invoice commitment must be non-zero').toBe(false);
            expect(isZero(record.ownerTag), 'merchant ownerTag must be non-zero').toBe(false);
            expect(isZero(record.payerTag), 'payerTag must remain zero before payment').toBe(true);
            return { ...invoice, invoiceIdBytes };
          },
        );

        const payerApi = await createTacitPayApi({
          providers: payerProviders,
          contractAddress: merchantApi.contractAddress,
          role: 'payer',
          paymentToken: NIGHT_TOKEN_COLOR,
        });
        await runStep('Step 3 — payer decodes link and pays into escrow', async () => {
          const payload = payerApi.decodeLink(`/pay${created.link}`);
          expect(payload.id).toBe(created.invoiceId);
          await payerApi.payInvoice(payload);
          const publicLedger = await waitForLedger(
            payerProviders,
            merchantApi.contractAddress,
            'a PAID invoice with escrow and payerTag',
            (candidate) =>
              candidate.invoices.member(created.invoiceIdBytes) &&
              candidate.invoices.lookup(created.invoiceIdBytes).status === InvoiceStatus.PAID &&
              candidate.escrow.member(created.invoiceIdBytes),
          );
          const record = publicLedger.invoices.lookup(created.invoiceIdBytes);
          expect(record.status).toBe(InvoiceStatus.PAID);
          expect(publicLedger.escrow.member(created.invoiceIdBytes)).toBe(true);
          expect(publicLedger.escrow.lookup(created.invoiceIdBytes).value).toBe(INVOICE_AMOUNT);
          expect(isZero(record.payerTag), 'payerTag must become non-zero after payment').toBe(
            false,
          );
          expect(publicLedger.paidCount).toBe(1n);
        });

        const withdrawnLedger = await runStep(
          'Step 4 — merchant withdraws and wallet NIGHT balance increases',
          async () => {
            const before = await nativeBalances(setup.merchantWallet.context);
            await merchantApi.withdraw(created.invoiceId);
            const publicLedger = await waitForLedger(
              merchantProviders,
              merchantApi.contractAddress,
              'a WITHDRAWN invoice with no escrow entry',
              (candidate) =>
                candidate.invoices.lookup(created.invoiceIdBytes).status ===
                  InvoiceStatus.WITHDRAWN && !candidate.escrow.member(created.invoiceIdBytes),
            );
            const after = await waitForNativeBalances(
              setup.merchantWallet.context,
              {
                unshielded: before.unshielded,
                shielded: before.shielded + INVOICE_AMOUNT,
              },
              INDEXER_TIMEOUT,
            );
            expect(publicLedger.invoices.lookup(created.invoiceIdBytes).status).toBe(
              InvoiceStatus.WITHDRAWN,
            );
            expect(publicLedger.escrow.member(created.invoiceIdBytes)).toBe(false);
            expect(after.shielded, 'merchant shielded NIGHT after withdraw').toBeGreaterThan(
              before.shielded,
            );
            return publicLedger;
          },
        );

        await runStep('Step 5 — public-state privacy dump excludes private inputs', async () => {
          const merchantPrivate =
            await merchantProviders.privateStateProvider.get('tacitpay-merchant');
          const payerPrivate = await payerProviders.privateStateProvider.get('tacitpay-payer');
          if (merchantPrivate === null || !isMerchantPrivateState(merchantPrivate)) {
            throw new Error('Merchant private state is unavailable for the privacy assertion');
          }
          if (payerPrivate === null || !isPayerPrivateState(payerPrivate)) {
            throw new Error('Payer private state is unavailable for the privacy assertion');
          }

          const dump = dumpPublicLedger(withdrawnLedger);
          const forbidden = [
            INVOICE_AMOUNT.toString(),
            INVOICE_AMOUNT.toString(16),
            INVOICE_MEMO,
            Buffer.from(INVOICE_MEMO, 'utf8').toString('hex'),
            toHex(merchantPrivate.secretKey),
            toHex(payerPrivate.secretKey),
          ];
          for (const value of forbidden) {
            expect(dump.toLowerCase(), `public state leaked ${value}`).not.toContain(
              value.toLowerCase(),
            );
          }
        });
      } finally {
        await Promise.allSettled([merchantWallet?.context.close(), payerWallet?.context.close()]);
        process.chdir(originalWorkingDirectory);
        await rm(privateStateRoot, { recursive: true, force: true });
      }
    },
    TEST_TIMEOUT,
  );
});
