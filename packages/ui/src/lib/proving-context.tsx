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

import { useTacitPay } from './api';
import {
  clearStoredCustomProverUrl,
  type CustomProverUrlValidation,
  getStoredCustomProverUrl,
  getStoredProvingPreference,
  type ProvingPreference,
  type ProvingResolution,
  resolveProvingTier,
  storeCustomProverUrl,
  storeProvingPreference,
} from './proving';
import type { WalletConnection } from './wallet';

interface ProvingContextValue {
  connection: WalletConnection | null;
  setConnection(connection: WalletConnection | null): void;
  preference: ProvingPreference;
  setPreference(preference: ProvingPreference): void;
  customUrl: string;
  setCustomUrl(value: string): CustomProverUrlValidation;
  clearCustomUrl(): void;
  resolution: ProvingResolution | null;
  resolving: boolean;
  refreshProving(): Promise<ProvingResolution>;
}

const ProvingContext = createContext<ProvingContextValue | null>(null);

export function ProvingSessionProvider({ children }: { children: ReactNode }) {
  const { network } = useTacitPay();
  // The live ConnectedAPI stays in React memory and is never written to browser storage.
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [preference, setPreferenceState] = useState<ProvingPreference>(getStoredProvingPreference);
  const [customUrl, setCustomUrlState] = useState(getStoredCustomProverUrl);
  const [resolution, setResolution] = useState<ProvingResolution | null>(null);
  const [resolving, setResolving] = useState(true);
  const latestRequest = useRef(0);

  const setPreference = useCallback((nextPreference: ProvingPreference) => {
    storeProvingPreference(nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  const setCustomUrl = useCallback((value: string) => {
    const validation = storeCustomProverUrl(value);
    if (validation.valid) setCustomUrlState(validation.url);
    return validation;
  }, []);

  const clearCustomUrl = useCallback(() => {
    clearStoredCustomProverUrl();
    setCustomUrlState('');
  }, []);

  const refreshProving = useCallback(async () => {
    const request = latestRequest.current + 1;
    latestRequest.current = request;
    setResolving(true);
    const nextResolution = await resolveProvingTier(connection, preference, customUrl);
    if (latestRequest.current === request) {
      setResolution(nextResolution);
      setResolving(false);
    }
    return nextResolution;
  }, [connection, customUrl, preference]);

  useEffect(() => {
    void refreshProving();
    return () => {
      // Ignore a stale health result after settings, wallet, or network changes.
      latestRequest.current += 1;
    };
  }, [refreshProving]);

  useEffect(() => {
    setConnection((current) => (current?.network === network ? current : null));
  }, [network]);

  const value = useMemo(
    () => ({
      connection,
      setConnection,
      preference,
      setPreference,
      customUrl,
      setCustomUrl,
      clearCustomUrl,
      resolution,
      resolving,
      refreshProving,
    }),
    [
      clearCustomUrl,
      connection,
      customUrl,
      preference,
      refreshProving,
      resolution,
      resolving,
      setCustomUrl,
      setPreference,
    ],
  );

  return <ProvingContext.Provider value={value}>{children}</ProvingContext.Provider>;
}

export function useProving(): ProvingContextValue {
  const context = useContext(ProvingContext);
  if (!context) throw new Error('useProving must be used inside ProvingSessionProvider.');
  return context;
}
