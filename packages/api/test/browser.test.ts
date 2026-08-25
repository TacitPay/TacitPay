import { describe, expect, it } from 'vitest';

import { createBrowserPrivateStoragePasswordProvider } from '../src/providers/browser.js';

describe('browser private-state password derivation', () => {
  it('stretches once and caches the policy-compliant password for the session', async () => {
    const provider = createBrowserPrivateStoragePasswordProvider(
      'correct horse battery staple',
      'mn_addr_preview1test',
    );
    const first = provider();

    expect(provider()).toBe(first);
    await expect(first).resolves.toMatch(/^Tp!9[0-9a-f]{64}$/u);
  });
});
