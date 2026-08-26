import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useProving } from '../proving-context';
import { useTacitPay } from './index';
import { getContractAddress } from './deployment';
import type { TacitPayApi } from './types';

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
}

const LiveContext = createContext<LiveContextValue | null>(null);

/**
 * Turns the mock-backed app into a chain-backed one once a wallet, a proving tier and a
 * contract address are all present, and the user supplies the passphrase that decrypts
 * their private state.
 *
 * It sits inside `ProvingSessionProvider` because that is where the connected wallet lives,
 * and installs the result back into `TacitPayProvider` through `setLiveApi`. Nothing is
 * attempted automatically: connecting reads private state and costs a wallet prompt, so it
 * is always a deliberate action.
 */
export function LiveApiProvider({ children }: { children: ReactNode }) {
  const { network, setLiveApi, setProofStage } = useTacitPay();
  const { connection, resolution } = useProving();
  const [state, setState] = useState<LiveState>({ status: 'unconfigured' });

  const contractAddress = getContractAddress(network);

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
          message: error instanceof Error ? error.message : 'Could not connect to the contract.',
        });
        throw error;
      }
    },
    [connection, contractAddress, network, resolution, setLiveApi, setProofStage],
  );

  const disconnect = useCallback(() => {
    setLiveApi(null);
    setState(contractAddress ? { status: 'locked', contractAddress } : { status: 'unconfigured' });
  }, [contractAddress, setLiveApi]);

  const value = useMemo(
    () => ({ state, blocker, connect, disconnect }),
    [blocker, connect, disconnect, state],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue {
  const context = useContext(LiveContext);
  if (!context) throw new Error('useLive must be used inside LiveApiProvider.');
  return context;
}
