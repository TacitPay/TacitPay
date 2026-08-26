import { readFile } from 'node:fs/promises';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

// The WASM-backed runtime must resolve to a single instance before the contract module
// loads — see the `resolutions` entry for onchain-runtime-v3 (D-012).
const { InvoiceStatus } = await import('@tacitpay/contracts/managed/tacitpay/contract');
const { createObserverApi } = await import('../src/index.js');
const { createPublicProviders } = await import('../src/providers/public.js');

const SANDBOX_FILE = new URL('../../../deployments/undeployed-sandbox.json', import.meta.url);
const LOCAL_INDEXER = {
  http: 'http://127.0.0.1:8088/api/v4/graphql',
  ws: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
};
const TEST_TIMEOUT = 120_000;

type Sandbox = {
  readonly contractAddress: string;
  readonly invoices: Record<'open' | 'paid' | 'withdrawn', { readonly invoiceId: string }>;
};

const readSandbox = async (): Promise<Sandbox | null> => {
  try {
    return JSON.parse(await readFile(SANDBOX_FILE, 'utf8')) as Sandbox;
  } catch {
    return null;
  }
};

const sandbox = process.env.TACITPAY_INT === '1' ? await readSandbox() : null;

/**
 * The observer is the path `/verify/<id>` uses, and its whole point is that it needs no
 * wallet, no proving, no private state and no contract connection — only an indexer. This
 * asserts that against a real chain, using the judge sandbox `yarn demo:seed` leaves behind.
 *
 * Run: `yarn env:up && yarn demo:seed`, then
 * `TACITPAY_INT=1 yarn workspace @tacitpay/api run test:int`.
 */
describe.skipIf(sandbox === null)('observer against a live devnet (no wallet)', () => {
  // `createPublicProviders` targets the browser; Node has no global WebSocket.
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
  setNetworkId('undeployed');

  const observer = () => {
    const providers = createPublicProviders({
      networkId: 'undeployed',
      indexerHttpUrl: LOCAL_INDEXER.http,
      indexerWsUrl: LOCAL_INDEXER.ws,
    });
    return createObserverApi(providers, sandbox!.contractAddress);
  };

  it(
    'reads every seeded invoice status with no wallet in the process',
    async () => {
      const api = observer();
      const [open, paid, withdrawn] = await Promise.all([
        api.getInvoiceStatus(sandbox!.invoices.open.invoiceId),
        api.getInvoiceStatus(sandbox!.invoices.paid.invoiceId),
        api.getInvoiceStatus(sandbox!.invoices.withdrawn.invoiceId),
      ]);

      expect(open).toMatchObject({ exists: true, status: InvoiceStatus.OPEN });
      expect(paid).toMatchObject({ exists: true, status: InvoiceStatus.PAID });
      expect(withdrawn).toMatchObject({ exists: true, status: InvoiceStatus.WITHDRAWN });
    },
    TEST_TIMEOUT,
  );

  it(
    'reports an unknown invoice as absent rather than throwing',
    async () => {
      // A verification page is routinely opened with a mistyped id; that is an answer,
      // not a failure, and the page must render it rather than break.
      await expect(observer().getInvoiceStatus('ab'.repeat(32))).resolves.toMatchObject({
        exists: false,
      });
    },
    TEST_TIMEOUT,
  );

  it(
    'rejects a malformed invoice id before touching the network',
    async () => {
      await expect(observer().getInvoiceStatus('not-hex')).rejects.toThrow();
    },
    TEST_TIMEOUT,
  );
});
