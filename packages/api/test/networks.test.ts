import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Guards config/networks.json against drift from the PRD §12.2 endpoint table.
const networks = JSON.parse(
  readFileSync(new URL('../../../config/networks.json', import.meta.url), 'utf8'),
) as Record<string, Record<string, string | null>>;

const NETWORK_IDS = ['undeployed', 'preview', 'preprod', 'mainnet'] as const;

describe('config/networks.json (PRD §12.2)', () => {
  it('defines exactly the four supported networks', () => {
    expect(Object.keys(networks).sort()).toEqual([...NETWORK_IDS].sort());
  });

  it.each(NETWORK_IDS)('%s has node, indexer, indexer-ws and proof-server endpoints', (id) => {
    const net = networks[id];
    expect(net.nodeUrl).toBeTruthy();
    expect(net.indexerUrl).toBeTruthy();
    expect(net.indexerWsUrl).toBeTruthy();
    expect(net.proofServerUrl).toBeTruthy();
  });

  it('preview endpoints match the PRD §12.2 table (primary public target)', () => {
    expect(networks.preview.nodeUrl).toBe('https://rpc.preview.midnight.network');
    expect(networks.preview.indexerUrl).toBe(
      'https://indexer.preview.midnight.network/api/v4/graphql',
    );
  });

  it('indexer endpoints use the v4 API path everywhere', () => {
    for (const id of NETWORK_IDS) {
      expect(networks[id].indexerUrl).toContain('/api/v4/graphql');
    }
  });
});
