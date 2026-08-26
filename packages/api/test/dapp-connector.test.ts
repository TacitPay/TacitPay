import type { FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { UnboundTransaction, ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import {
  type BrowserWalletApi,
  createDAppConnectorWalletProvider,
  createProofProviderForTier,
  DAppConnectorWalletProvider,
  LOCAL_PROOF_SERVER_URL,
  walletCanProve,
} from '../src/providers/browser.js';
import type { CircuitIds } from '../src/types.js';

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);

/** Only `serialize` and `identifiers` are reached; the ledger WASM is not needed here. */
const fakeTx = (raw: Uint8Array, identifiers: string[] = []) =>
  ({ serialize: () => raw, identifiers: () => identifiers }) as unknown as FinalizedTransaction &
    UnboundTransaction;

const connector = (overrides: Partial<BrowserWalletApi> = {}): BrowserWalletApi => ({
  balanceUnsealedTransaction: vi.fn(async () => ({ tx: '' })),
  submitTransaction: vi.fn(async () => undefined),
  getShieldedAddresses: vi.fn(async () => ({
    shieldedAddress: 'addr',
    shieldedCoinPublicKey: '11'.repeat(32),
    shieldedEncryptionPublicKey: '22'.repeat(32),
  })),
  ...overrides,
});

describe('DApp Connector wallet provider', () => {
  it('hands the connector a hex-encoded transaction to balance', async () => {
    const api = connector();
    const provider = new DAppConnectorWalletProvider(api, 'coin', 'enc');
    const raw = bytes(0xde, 0xad, 0xbe, 0xef);

    // Deserializing the empty reply fails; the outbound encoding is what this asserts.
    await provider.balanceTx(fakeTx(raw)).catch(() => undefined);

    expect(api.balanceUnsealedTransaction).toHaveBeenCalledWith(toHex(raw));
  });

  it('returns the last identifier, matching WalletFacade.submitTransaction', async () => {
    const api = connector();
    const provider = new DAppConnectorWalletProvider(api, 'coin', 'enc');
    const raw = bytes(1, 2, 3);

    await expect(provider.submitTx(fakeTx(raw, ['first', 'last']))).resolves.toBe('last');
    expect(api.submitTransaction).toHaveBeenCalledWith(toHex(raw));
  });

  it('refuses to submit a transaction that carries no watchable identifier', async () => {
    const api = connector();
    const provider = new DAppConnectorWalletProvider(api, 'coin', 'enc');

    await expect(provider.submitTx(fakeTx(bytes(1), []))).rejects.toThrow(/no identifier/u);
    // Nothing may reach the chain that the caller could not then watch for.
    expect(api.submitTransaction).not.toHaveBeenCalled();
  });

  it('exposes the shielded keys the wallet reported', async () => {
    const provider = await createDAppConnectorWalletProvider(connector(), 'preview');

    expect(provider.getCoinPublicKey()).toBe('11'.repeat(32));
    expect(provider.getEncryptionPublicKey()).toBe('22'.repeat(32));
  });
});

describe('proving tier selection (PRD §8.3, D-010)', () => {
  const zkConfigProvider = {} as ZKConfigProvider<CircuitIds>;

  it('detects in-wallet proving only when the connector implements it', () => {
    expect(walletCanProve(connector())).toBe(false);
    expect(walletCanProve(connector({ getProvingProvider: vi.fn() }))).toBe(true);
  });

  it('refuses the wallet tier when the connector cannot prove', async () => {
    await expect(
      createProofProviderForTier({ tier: 'wallet' }, connector(), zkConfigProvider),
    ).rejects.toThrow(/does not provide in-browser proving/u);
  });

  it('reports the endpoint for the server tiers', async () => {
    const local = await createProofProviderForTier(
      { tier: 'local', url: LOCAL_PROOF_SERVER_URL },
      connector(),
      zkConfigProvider,
    );
    const custom = await createProofProviderForTier(
      { tier: 'custom', url: 'https://prover.example' },
      connector(),
      zkConfigProvider,
    );

    expect(local).toMatchObject({ tier: 'local', url: LOCAL_PROOF_SERVER_URL });
    expect(custom).toMatchObject({ tier: 'custom', url: 'https://prover.example' });
  });
});
