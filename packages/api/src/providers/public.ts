import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

import type { ObserverProviders } from '../observer.js';
import type { NetworkId } from '../types.js';

export type PublicProviderConfig = {
  readonly networkId: NetworkId;
  readonly indexerHttpUrl: string;
  readonly indexerWsUrl: string;
};

/**
 * The single provider a public read needs.
 *
 * This lives apart from `providers/browser.ts` on purpose, and the separation is load
 * bearing rather than tidy: that module imports `levelPrivateStateProvider`, which pulls
 * LevelDB and Node's `events` in at module scope. Importing it to read a public status
 * would drag the whole encrypted private-state stack into a page that has no private state
 * — and in a browser that fails outright with "Class extends value undefined".
 *
 * `/verify/<id>` must work for someone with no wallet and no private state, so its
 * dependency graph must not contain either.
 */
export const createPublicProviders = (config: PublicProviderConfig): ObserverProviders => {
  // Midnight reads this global while provider instances are constructed.
  setNetworkId(config.networkId);
  const browserWebSocket = globalThis.WebSocket as unknown as NonNullable<
    Parameters<typeof indexerPublicDataProvider>[2]
  >;
  return {
    publicDataProvider: indexerPublicDataProvider(
      config.indexerHttpUrl,
      config.indexerWsUrl,
      browserWebSocket,
    ),
  };
};
