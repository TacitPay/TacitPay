import networkEndpoints from '@config/networks.json';

import type { InvoiceNetwork } from './types';

/** `local` in the UI is Midnight's `undeployed` network id. */
export const NETWORK_IDS = {
  local: 'undeployed',
  preview: 'preview',
} as const satisfies Record<InvoiceNetwork, string>;

export type Endpoints = {
  indexerUrl: string;
  indexerWsUrl: string;
  proofServerUrl: string;
};

/** Reads config/networks.json, the same table the CLI and the network tests use. */
export const endpointsFor = (network: InvoiceNetwork): Endpoints => {
  const config = networkEndpoints[NETWORK_IDS[network]];
  return {
    indexerUrl: config.indexerUrl,
    indexerWsUrl: config.indexerWsUrl,
    proofServerUrl: config.proofServerUrl,
  };
};

const STORAGE_KEY = 'tacitpay.contract-address.v1';

/**
 * Baked in at build time once a contract is deployed to that network:
 *
 *   VITE_TACITPAY_CONTRACT_PREVIEW=0x…  yarn workspace @tacitpay/ui run build
 *
 * Local devnet addresses change with every fresh chain, so they are not build-time
 * values — `yarn demo:seed` prints one and Settings stores it.
 */
const BUILT_IN: Record<InvoiceNetwork, string | undefined> = {
  preview: import.meta.env.VITE_TACITPAY_CONTRACT_PREVIEW,
  local: import.meta.env.VITE_TACITPAY_CONTRACT_LOCAL,
};

/** A contract address is 32 bytes of hex, with or without an 0x prefix. */
const CONTRACT_ADDRESS = /^(?:0x)?[0-9a-f]{64}$/iu;

export const isContractAddress = (value: string): boolean => CONTRACT_ADDRESS.test(value.trim());

const storageKeyFor = (network: InvoiceNetwork): string => `${STORAGE_KEY}:${network}`;

export function getStoredContractAddress(network: InvoiceNetwork): string | undefined {
  try {
    const saved = localStorage.getItem(storageKeyFor(network))?.trim();
    return saved && isContractAddress(saved) ? saved : undefined;
  } catch {
    return undefined;
  }
}

export function storeContractAddress(network: InvoiceNetwork, value: string): boolean {
  const address = value.trim();
  if (!isContractAddress(address)) return false;
  try {
    localStorage.setItem(storageKeyFor(network), address);
  } catch {
    // The address stays session-only when browser storage is unavailable.
  }
  return true;
}

export function clearStoredContractAddress(network: InvoiceNetwork): void {
  try {
    localStorage.removeItem(storageKeyFor(network));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

/** A stored address wins, so a judge can point the app at their own local deployment. */
export function getContractAddress(network: InvoiceNetwork): string | undefined {
  const built = BUILT_IN[network];
  return (
    getStoredContractAddress(network) ?? (built && isContractAddress(built) ? built : undefined)
  );
}
