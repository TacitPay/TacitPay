import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getErrorMessage } from '../errors';
import { useProving } from '../proving-context';
import {
  connectInjectedWallet,
  getStoredWalletIdentity,
  listInjectedWallets,
  type WalletConnection,
} from '../wallet';
import { useTacitPay } from './index';
import { endpointsFor, getContractAddress, NETWORK_IDS } from './deployment';
import type { InvoiceNetwork, InvoiceStatus, Observable, TacitPayApi } from './types';

/** The read-only surface `/verify/<id>` needs. No wallet, no proving, no private state. */
export interface LiveObserver {
  readonly contractAddress: string;
  getInvoiceStatus(
    invoiceId: string,
  ): Promise<{ status: InvoiceStatus; expiresAt: number; exists: boolean }>;
  watchInvoice(invoiceId: string): Observable<InvoiceStatus>;
}

// The ledger's InvoiceStatus is a NUMERIC enum (OPEN = 0 … CANCELLED = 3); the UI speaks
// the string union above. Written as literals so the ledger module stays out of this
// chunk — the wallet-backed adapter applies the same translation in real.ts.
const STATUS_NAMES: Record<number, InvoiceStatus> = {
  0: 'OPEN',
  1: 'PAID',
  2: 'WITHDRAWN',
  3: 'CANCELLED',
};

const statusName = (status: number): InvoiceStatus => {
  const name = STATUS_NAMES[status];
  if (name === undefined) throw new Error(`Unknown invoice status ${String(status)}`);
  return name;
};

export type LiveState =
  /** No contract address is configured for this network, so there is nothing to connect to. */
  | { readonly status: 'unconfigured' }
  /** Everything is in place except the passphrase that decrypts on-device private state. */
  | { readonly status: 'locked'; readonly contractAddress: string }
  | { readonly status: 'connecting'; readonly contractAddress: string }
  | { readonly status: 'live'; readonly contractAddress: string }
  | { readonly status: 'error'; readonly contractAddress: string; readonly message: string };

export type LiveBlocker = 'wallet' | 'proving' | 'contract' | null;

interface LiveContextValue {
  state: LiveState;
  /** What is missing before `connect` can be called, if anything. */
  blocker: LiveBlocker;
  connect(passphrase: string): Promise<void>;
  disconnect(): void;
  /**
   * Present whenever a contract address is configured — no wallet required. Public status
   * reads go through this even when the rest of the app is still on the mock.
   */
  observer: LiveObserver | null;
}

interface WalletReconnectAttempt {
  readonly identity: string;
  readonly result: Promise<WalletConnection | null>;
}

const LiveContext = createContext<LiveContextValue | null>(null);

/**
 * Turns the mock-backed app into a chain-backed one once a wallet, a proving tier and a
 * contract address are all present, and the user supplies the passphrase that decrypts
 * their private state.
 *
 * It sits inside `ProvingSessionProvider` because that is where the connected wallet lives,
 * and installs the result back into `TacitPayProvider` through `setLiveApi`. After a reload
 * the previously authorized WALLET reconnects silently, but the passphrase is deliberately
 * memory-only — it never touches browser storage (D-023) — so unlocking private state
 * always costs one fresh prompt.
 */
export function LiveApiProvider({ children }: { children: ReactNode }) {
  const { network, setLiveApi, setProofStage } = useTacitPay();
  const { connection, resolution, setConnection } = useProving();
  const [state, setState] = useState<LiveState>({ status: 'unconfigured' });
  const [observer, setObserver] = useState<LiveObserver | null>(null);
  const reconnectAttempts = useRef(new Map<InvoiceNetwork, WalletReconnectAttempt | null>());

  const contractAddress = getContractAddress(network);

  // A contract address is the only prerequisite for reading public status, so the observer
  // is built as soon as one exists. Dynamically imported to keep the ledger code out of the
  // entry chunk — a visitor who never opens a verification page never downloads it.
  useEffect(() => {
    if (!contractAddress) {
      setObserver(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        // Deliberately NOT '@tacitpay/api/browser' — that entry imports the encrypted
        // private-state store, which a public read has no business loading.
        const [{ createPublicProviders }, { createObserverApi }] = await Promise.all([
          import('@tacitpay/api/public'),
          import('@tacitpay/api'),
        ]);
        const endpoints = endpointsFor(network);
        const providers = createPublicProviders({
          networkId: NETWORK_IDS[network],
          indexerHttpUrl: endpoints.indexerUrl,
          indexerWsUrl: endpoints.indexerWsUrl,
        });
        // The api's observer returns the ledger's numeric statuses; translate them to
        // the UI's string union here. This wrapper replaces an `as unknown as` cast
        // that let the raw digits through — /verify rendered "1" instead of "PAID".
        const raw = createObserverApi(providers, contractAddress);
        const mapped: LiveObserver = {
          contractAddress: raw.contractAddress,
          getInvoiceStatus: async (invoiceId) => {
            const result = await raw.getInvoiceStatus(invoiceId);
            return { ...result, status: statusName(result.status) };
          },
          watchInvoice: (invoiceId) => {
            const source = raw.watchInvoice(invoiceId);
            return {
              subscribe(next) {
                const emit = typeof next === 'function' ? next : next.next.bind(next);
                const fail = typeof next === 'function' ? undefined : next.error?.bind(next);
                const subscription = source.subscribe({
                  next: (status) => emit(statusName(status)),
                  error: (cause: unknown) => fail?.(cause),
                });
                return { unsubscribe: () => subscription.unsubscribe() };
              },
            };
          },
        };
        if (!cancelled) {
          setObserver(mapped);
        }
      } catch (error) {
        // A failed observer leaves the page on mock data rather than blanking it, but it
        // must say so — a silently null observer is indistinguishable from an unconfigured
        // one, and that is an hour of debugging for whoever hits it next.
        console.error('TacitPay: could not reach the contract for public reads', error);
        if (!cancelled) setObserver(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractAddress, network]);

  const blocker: LiveBlocker = !contractAddress
    ? 'contract'
    : !connection
      ? 'wallet'
      : !resolution?.effectiveTier
        ? 'proving'
        : null;

  // A wallet disconnect, a network switch or a lost prover invalidates the live API.
  useEffect(() => {
    if (blocker === null) return;
    setLiveApi(null);
    setState(contractAddress ? { status: 'locked', contractAddress } : { status: 'unconfigured' });
  }, [blocker, contractAddress, setLiveApi]);

  const connect = useCallback(
    async (passphrase: string) => {
      const tier = resolution?.effectiveTier;
      if (!contractAddress || !connection || !tier) {
        throw new Error('A wallet, a prover and a contract address are all required.');
      }
      setState({ status: 'connecting', contractAddress });
      try {
        // Imported here so the ledger and proving code stays out of the first-load bundle.
        const { createRealTacitPayApi } = await import('./real');
        const api: TacitPayApi = await createRealTacitPayApi({
          network,
          contractAddress,
          wallet: connection.api as Parameters<typeof createRealTacitPayApi>[0]['wallet'],
          passphrase,
          accountId: connection.address,
          // The display symbol maps to the API's semantic token union.
          token: endpointsFor(network).tokenSymbol.toUpperCase().includes('USDM')
            ? 'USDM'
            : 'NIGHT',
          proving:
            tier === 'wallet' ? { tier: 'wallet' } : { tier, url: resolution.effectiveUrl ?? '' },
          onProofStage: setProofStage,
        });
        setLiveApi(api);
        setState({ status: 'live', contractAddress });
      } catch (error) {
        setLiveApi(null);
        setState({
          status: 'error',
          contractAddress,
          // Mapped, not raw: a wrong passphrase reaches here as WebCrypto's
          // opaque OperationError, and the mapper names the real cause.
          message: getErrorMessage(error),
        });
        throw error;
      }
    },
    [connection, contractAddress, network, resolution, setLiveApi, setProofStage],
  );

  useEffect(() => {
    if (connection) return;

    const attempts = reconnectAttempts.current;
    let attempt = attempts.get(network);
    if (!attempts.has(network)) {
      const identity = getStoredWalletIdentity(network);
      if (!identity) {
        attempts.set(network, null);
        return;
      }
      const wallet = listInjectedWallets().find(
        (candidate) =>
          candidate.supported && (candidate.injectionKey === identity || candidate.id === identity),
      );
      if (!wallet?.supported) {
        attempts.set(network, null);
        return;
      }
      attempt = {
        identity,
        // A rejected background wallet request stays silent so the tile remains actionable.
        result: connectInjectedWallet(wallet, network).catch(() => null),
      };
      attempts.set(network, attempt);
    }
    if (!attempt) return;

    const activeAttempt = attempt;
    let cancelled = false;
    void activeAttempt.result.then((restoredConnection) => {
      if (
        cancelled ||
        !restoredConnection ||
        getStoredWalletIdentity(network) !== activeAttempt.identity
      ) {
        return;
      }
      setConnection(restoredConnection);
    });

    return () => {
      cancelled = true;
    };
  }, [connection, network, setConnection]);

  const disconnect = useCallback(() => {
    setLiveApi(null);
    setState(contractAddress ? { status: 'locked', contractAddress } : { status: 'unconfigured' });
  }, [contractAddress, setLiveApi]);

  const value = useMemo(
    () => ({ state, blocker, connect, disconnect, observer }),
    [blocker, connect, disconnect, observer, state],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue {
  const context = useContext(LiveContext);
  if (!context) throw new Error('useLive must be used inside LiveApiProvider.');
  return context;
}
