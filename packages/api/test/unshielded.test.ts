import { Buffer } from 'node:buffer';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  MerchantPrivateState,
  PayerPrivateState,
  TacitPayPrivateState,
  TacitPayProviders,
  TacitPayRole,
} from '../src/types.js';

type PublicTxResult = Promise<{ readonly public: { readonly txId: string } }>;
type PayInvoiceUnshieldedCall = (
  invoiceId: Uint8Array,
  amount: bigint,
  memoHash: Uint8Array,
  salt: Uint8Array,
) => PublicTxResult;
type WithdrawUnshieldedCall = (
  invoiceId: Uint8Array,
  to: { readonly bytes: Uint8Array },
) => PublicTxResult;

const mocks = vi.hoisted(() => ({
  publicLedger: {} as Record<string, unknown>,
  contract: {
    callTx: {
      payInvoiceUnshielded: vi.fn<PayInvoiceUnshieldedCall>(async () => ({
        public: { txId: 'pay-unshielded-tx' },
      })),
      withdrawUnshielded: vi.fn<WithdrawUnshieldedCall>(async () => ({
        public: { txId: 'withdraw-unshielded-tx' },
      })),
    },
  },
}));

vi.mock('@midnight-ntwrk/midnight-js-contracts', () => ({
  deployContract: vi.fn(),
  findDeployedContract: vi.fn(async () => mocks.contract),
}));

vi.mock('@midnight-ntwrk/midnight-js-protocol/compact-js', () => ({
  CompiledContract: {
    make: vi.fn(() => ({})),
    withWitnesses: vi.fn((compiled: unknown) => compiled),
    withCompiledFileAssets: vi.fn((compiled: unknown) => compiled),
  },
}));

vi.mock('@tacitpay/contracts/managed/tacitpay/contract', () => ({
  Contract: {},
  InvoiceStatus: { OPEN: 0, PAID: 1, WITHDRAWN: 2, CANCELLED: 3 },
  ledger: vi.fn(() => mocks.publicLedger),
}));

const { InvoiceStatus, NIGHT_TOKEN_COLOR, bytes32FromHex, createTacitPayApi } =
  await import('../src/index.js');

const CONTRACT_ADDRESS = '11'.repeat(32);
const INVOICE_ID = '22'.repeat(32);
const SALT = '33'.repeat(32);
const DESTINATION = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const DESTINATION_HEX = Buffer.from(DESTINATION).toString('hex');
const DESTINATION_BECH32M = MidnightBech32m.encode(
  'undeployed',
  new UnshieldedAddress(Buffer.from(DESTINATION)),
).asString();

const merchantInvoice = {
  amount: 42n,
  memo: 'unshielded settlement',
  memoHash: '44'.repeat(32),
  salt: SALT,
  expiresAt: 0,
  createdAt: 1,
  status: 'PAID' as const,
  txIds: { created: 'create-tx' },
};

const privateStateFor = (role: TacitPayRole): TacitPayPrivateState =>
  role === 'merchant'
    ? ({
        secretKey: new Uint8Array(32),
        invoices: { [INVOICE_ID]: merchantInvoice },
      } satisfies MerchantPrivateState)
    : ({ secretKey: new Uint8Array(32), receipts: {} } satisfies PayerPrivateState);

const providersFor = (
  role: TacitPayRole,
): {
  readonly providers: TacitPayProviders;
  readonly states: Record<string, TacitPayPrivateState>;
} => {
  const states: Record<string, TacitPayPrivateState> = {
    [role === 'merchant' ? 'tacitpay-merchant' : 'tacitpay-payer']: privateStateFor(role),
  };
  const privateStateProvider = {
    setContractAddress: vi.fn(),
    get: vi.fn(async (id: string) => states[id] ?? null),
    set: vi.fn(async (id: string, state: TacitPayPrivateState) => {
      states[id] = state;
    }),
  };
  return {
    states,
    providers: {
      privateStateProvider,
      publicDataProvider: {
        queryContractState: vi.fn(async () => ({ data: new Uint8Array() })),
      },
      zkConfigProvider: { directory: '/tmp/tacitpay-managed' },
    } as unknown as TacitPayProviders,
  };
};

const mapEntry = <T>(value: T | undefined) => ({
  member: vi.fn((id: Uint8Array) =>
    value === undefined ? false : Buffer.from(id).equals(Buffer.from(INVOICE_ID, 'hex')),
  ),
  lookup: vi.fn(() => {
    if (value === undefined) throw new Error('missing map entry');
    return value;
  }),
});

const openApi = async (role: TacitPayRole) => {
  const harness = providersFor(role);
  const api = await createTacitPayApi({
    providers: harness.providers,
    contractAddress: CONTRACT_ADDRESS,
    role,
    paymentToken: NIGHT_TOKEN_COLOR,
  });
  return { api, ...harness };
};

beforeEach(() => {
  vi.clearAllMocks();
  setNetworkId('undeployed');
  mocks.publicLedger = {
    paymentToken: NIGHT_TOKEN_COLOR,
    invoices: mapEntry({ status: InvoiceStatus.PAID, expiresAt: 0n }),
    escrow: mapEntry(undefined),
    unshieldedOwed: mapEntry(42n),
  };
});

describe('unshielded settlement API', () => {
  it('pays without constructing or passing a shielded coin', async () => {
    const { api, states } = await openApi('payer');
    const payload = {
      v: 1 as const,
      net: 'undeployed' as const,
      contract: CONTRACT_ADDRESS,
      id: INVOICE_ID,
      amount: '42',
      token: 'NIGHT' as const,
      memo: 'unshielded settlement',
      salt: SALT,
      exp: 0,
    };

    await expect(api.payInvoiceUnshielded(payload)).resolves.toEqual({
      txId: 'pay-unshielded-tx',
    });

    const call = mocks.contract.callTx.payInvoiceUnshielded.mock.calls[0];
    expect(call).toHaveLength(4);
    expect(call[0]).toEqual(bytes32FromHex(INVOICE_ID));
    expect(call[1]).toBe(42n);
    expect(call[2]).toBeInstanceOf(Uint8Array);
    expect(call[3]).toEqual(bytes32FromHex(SALT));
    expect((states['tacitpay-payer'] as PayerPrivateState).receipts[INVOICE_ID]).toMatchObject({
      amount: 42n,
      memo: payload.memo,
      txId: 'pay-unshielded-tx',
    });
  });

  it.each([
    ['hex', DESTINATION_HEX],
    ['Bech32m', DESTINATION_BECH32M],
  ])('withdraws to a %s unshielded address', async (_label, to) => {
    const { api, states } = await openApi('merchant');

    await expect(api.withdrawUnshielded(INVOICE_ID, to)).resolves.toEqual({
      txId: 'withdraw-unshielded-tx',
    });

    const call = mocks.contract.callTx.withdrawUnshielded.mock.calls[0];
    expect(call[0]).toEqual(bytes32FromHex(INVOICE_ID));
    expect(call[1]).toEqual({ bytes: DESTINATION });
    expect(
      (states['tacitpay-merchant'] as MerchantPrivateState).invoices[INVOICE_ID],
    ).toMatchObject({
      status: 'WITHDRAWN',
      txIds: { created: 'create-tx', withdrawn: 'withdraw-unshielded-tx' },
    });
  });

  it('reports the public pool that currently holds custody', async () => {
    const { api } = await openApi('merchant');

    await expect(api.getInvoiceStatus(INVOICE_ID)).resolves.toMatchObject({
      exists: true,
      status: InvoiceStatus.PAID,
      paidPool: 'unshielded',
    });
    await expect(api.listMyInvoices()).resolves.toMatchObject([
      { invoiceId: INVOICE_ID, paidPool: 'unshielded' },
    ]);
  });
});
