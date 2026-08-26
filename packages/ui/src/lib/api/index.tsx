import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { createMockTacitPayApi } from './mock';
import type { InvoiceNetwork, ProofStage, TacitPayApi } from './types';

const NETWORK_STORAGE_KEY = 'tacitpay.display-network';

interface TacitPayContextValue {
  api: TacitPayApi;
  network: InvoiceNetwork;
  setNetwork(network: InvoiceNetwork): void;
  proofStage: ProofStage | null;
  setProofStage(stage: ProofStage | null): void;
  clearProofStage(): void;
  /** True once a chain-backed API has replaced the mock. */
  live: boolean;
  /** Installed by LiveApiGate once a wallet, a contract and a prover are all available. */
  setLiveApi(api: TacitPayApi | null): void;
}

const TacitPayContext = createContext<TacitPayContextValue | null>(null);

function getInitialNetwork(): InvoiceNetwork {
  try {
    const saved = localStorage.getItem(NETWORK_STORAGE_KEY);
    return saved === 'local' ? 'local' : 'preview';
  } catch {
    return 'preview';
  }
}

interface TacitPayProviderProps {
  children: ReactNode;
  api?: TacitPayApi;
}

// The optional api prop is the single swap point for the future @tacitpay/api adapter.
export function TacitPayProvider({ children, api: injectedApi }: TacitPayProviderProps) {
  const [network, setNetworkState] = useState<InvoiceNetwork>(getInitialNetwork);
  const [proofStage, setProofStage] = useState<ProofStage | null>(null);
  const [liveApi, setLiveApi] = useState<TacitPayApi | null>(null);

  const mockApi = useMemo(
    () => createMockTacitPayApi({ network, onProofStage: setProofStage }),
    [network],
  );
  // Explicit injection wins (tests, Storybook), then a live chain-backed API, then the mock.
  const api = injectedApi ?? liveApi ?? mockApi;

  const setNetwork = useCallback((nextNetwork: InvoiceNetwork) => {
    try {
      localStorage.setItem(NETWORK_STORAGE_KEY, nextNetwork);
    } catch {
      // Display selection can remain session-only when storage is unavailable.
    }
    // A live API is bound to one network's endpoints and contract, so it cannot survive.
    setLiveApi(null);
    setNetworkState(nextNetwork);
  }, []);

  const clearProofStage = useCallback(() => setProofStage(null), []);

  const value = useMemo(
    () => ({
      api,
      network,
      setNetwork,
      proofStage,
      setProofStage,
      clearProofStage,
      live: injectedApi === undefined && liveApi !== null,
      setLiveApi,
    }),
    [api, clearProofStage, injectedApi, liveApi, network, proofStage, setNetwork],
  );

  return <TacitPayContext.Provider value={value}>{children}</TacitPayContext.Provider>;
}

export function useTacitPay() {
  const context = useContext(TacitPayContext);
  if (!context) throw new Error('useTacitPay must be used inside TacitPayProvider.');
  return context;
}

export type {
  InvoiceLinkPayload,
  InvoiceNetwork,
  InvoiceStatus,
  InvoiceView,
  ProofStage,
  ReceiptView,
  TacitPayApi,
} from './types';
export { PROOF_STAGES } from './types';
