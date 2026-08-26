import type { InvoiceNetwork } from './api';

export type ConnectedWalletApi = Record<string, unknown>;
export type KnownWallet = 'lace' | '1am';

interface DetectedWalletBase {
  id: string;
  injectionKey: string;
  rdns?: string;
  name: string;
  icon?: string;
  apiVersion?: string;
  apiVersionWarning?: string;
  knownWallet?: KnownWallet;
}

export interface SupportedDetectedWallet extends DetectedWalletBase {
  supported: true;
  initialApi: ConnectedWalletApi;
}

export interface UnsupportedDetectedWallet extends DetectedWalletBase {
  supported: false;
  unsupportedReason: string;
}

export type DetectedWallet = SupportedDetectedWallet | UnsupportedDetectedWallet;

export interface WalletConnection {
  walletId: string;
  walletName: string;
  address: string;
  status: 'connected';
  network: InvoiceNetwork;
  apiVersion?: string;
  apiVersionWarning?: string;
  readonly api: ConnectedWalletApi;
}

declare global {
  interface Window {
    midnight?: Record<string, unknown>;
  }
}

const SUPPORTED_API_VERSION = /^4\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const STORAGE_KEY = 'tacitpay.wallet';

const storageKeyFor = (network: InvoiceNetwork): string => `${STORAGE_KEY}:${network}`;

export function getStoredWalletIdentity(network: InvoiceNetwork): string | undefined {
  try {
    const saved = localStorage.getItem(storageKeyFor(network))?.trim();
    return saved || undefined;
  } catch {
    return undefined;
  }
}

export function storeWalletIdentity(network: InvoiceNetwork, value: string): boolean {
  const identity = value.trim();
  if (!identity) return false;
  try {
    localStorage.setItem(storageKeyFor(network), identity);
  } catch {
    // The identity stays session-only when browser storage is unavailable.
  }
  return true;
}

export function clearStoredWalletIdentity(network: InvoiceNetwork): void {
  try {
    localStorage.removeItem(storageKeyFor(network));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

function isRecord(value: unknown): value is ConnectedWalletApi {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readProperty(record: ConnectedWalletApi, key: string): unknown {
  try {
    return Reflect.get(record, key);
  } catch {
    return undefined;
  }
}

function safeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim().slice(0, maxLength);
  return text || undefined;
}

function safeIcon(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 200_000) return undefined;
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,/iu.test(value)) return value;
  // SVG data URIs are what most connector wallets (Lace included) inject; an
  // <img> src never executes scripts, so they are safe to render.
  if (/^data:image\/svg\+xml[;,]/iu.test(value)) return value;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'chrome-extension:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function detectKnownWallet(
  injectionKey: string,
  rdns?: string,
  name?: string,
): KnownWallet | undefined {
  const key = injectionKey.trim().toLowerCase();
  const displayIdentity = [rdns, name].filter(Boolean).join(' ').toLowerCase();
  if (key === '1am' || /(?:^|[^a-z0-9])1am(?:[^a-z0-9]|$)/u.test(displayIdentity)) {
    return '1am';
  }
  if (displayIdentity.includes('lace')) return 'lace';
  return undefined;
}

function getApiVersionWarning(rawVersion: unknown, apiVersion?: string): string | undefined {
  if (rawVersion === undefined) return undefined;
  if (!apiVersion || !SUPPORTED_API_VERSION.test(apiVersion)) {
    return apiVersion
      ? `Connector API ${apiVersion} is outside the supported 4.x range. Connection may still work.`
      : 'This connector reports an unreadable API version. Connection may still work.';
  }
  return undefined;
}

function describeWallet(injectionKey: string, value: unknown): DetectedWalletBase {
  const record = isRecord(value) ? value : undefined;
  const rdns = record ? safeText(readProperty(record, 'rdns'), 160) : undefined;
  const providedName = record ? safeText(readProperty(record, 'name'), 80) : undefined;
  const knownWallet = detectKnownWallet(injectionKey, rdns, providedName);
  const rawVersion = record ? readProperty(record, 'apiVersion') : undefined;
  const apiVersion = safeText(rawVersion, 40);

  return {
    id: rdns ?? injectionKey,
    injectionKey,
    rdns,
    name:
      providedName ??
      (knownWallet === 'lace' ? 'Lace' : knownWallet === '1am' ? '1AM' : 'Midnight wallet'),
    icon: record ? safeIcon(readProperty(record, 'icon')) : undefined,
    apiVersion,
    apiVersionWarning: getApiVersionWarning(rawVersion, apiVersion),
    knownWallet,
  };
}

export function listInjectedWallets(): DetectedWallet[] {
  if (typeof window === 'undefined' || !isRecord(window.midnight)) return [];

  return Object.entries(window.midnight).map(([injectionKey, value]) => {
    const details = describeWallet(injectionKey, value);
    if (!isRecord(value)) {
      return {
        ...details,
        supported: false,
        unsupportedReason: 'This injection is not a Midnight wallet connector.',
      };
    }
    if (typeof readProperty(value, 'connect') !== 'function') {
      return {
        ...details,
        supported: false,
        unsupportedReason: 'This connector does not expose connect().',
      };
    }
    return { ...details, supported: true, initialApi: value };
  });
}

function readAddress(value: unknown): string {
  if (typeof value === 'string') return value;
  if (isRecord(value)) {
    const address = readProperty(value, 'unshieldedAddress');
    if (typeof address === 'string') return address;
  }
  throw new Error('The wallet did not return an unshielded address.');
}

function retainConnectedApi(
  summary: Omit<WalletConnection, 'api'>,
  api: ConnectedWalletApi,
): WalletConnection {
  // Keep the live connector in memory while excluding it from accidental JSON serialization.
  Object.defineProperty(summary, 'api', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: api,
  });
  return summary as WalletConnection;
}

export async function connectInjectedWallet(
  wallet: DetectedWallet,
  network: InvoiceNetwork,
): Promise<WalletConnection> {
  if (!wallet.supported) throw new Error(wallet.unsupportedReason);

  const connect = readProperty(wallet.initialApi, 'connect');
  if (typeof connect !== 'function') throw new Error('This wallet cannot connect to TacitPay.');

  const networkId = network === 'local' ? 'undeployed' : 'preview';
  const connectedValue = await Reflect.apply(connect, wallet.initialApi, [networkId]);
  if (!isRecord(connectedValue)) throw new Error('The wallet returned an invalid connection.');

  const getConnectionStatus = readProperty(connectedValue, 'getConnectionStatus');
  const getUnshieldedAddress = readProperty(connectedValue, 'getUnshieldedAddress');
  if (typeof getConnectionStatus !== 'function' || typeof getUnshieldedAddress !== 'function') {
    throw new Error('This wallet connector is missing required connection methods.');
  }

  const statusValue = await Reflect.apply(getConnectionStatus, connectedValue, []);
  if (!isRecord(statusValue) || readProperty(statusValue, 'status') !== 'connected') {
    throw new Error('The wallet did not confirm the connection.');
  }
  const connectedNetwork = readProperty(statusValue, 'networkId');
  if (typeof connectedNetwork === 'string' && connectedNetwork !== networkId) {
    throw new Error(`The wallet connected to ${connectedNetwork}, not ${networkId}.`);
  }

  const addressValue = await Reflect.apply(getUnshieldedAddress, connectedValue, []);
  return retainConnectedApi(
    {
      walletId: wallet.id,
      walletName: wallet.name,
      address: readAddress(addressValue),
      status: 'connected',
      network,
      apiVersion: wallet.apiVersion,
      apiVersionWarning: wallet.apiVersionWarning,
    },
    connectedValue,
  );
}
