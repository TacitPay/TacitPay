import { cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import wasm from 'vite-plugin-wasm';

const REPO_ROOT = new URL('../../', import.meta.url);
const MANAGED_DIR = new URL('contracts/managed/tacitpay/', REPO_ROOT);

/** The two artifact directories `FetchZkConfigProvider` fetches from. */
const ZK_ASSET_DIRS = ['keys', 'zkir'] as const;

/**
 * `compact compile` writes the prover keys and ZKIR into `contracts/managed/`, which is
 * gitignored — they are build output, not source. The browser still has to fetch them, so
 * this serves them in dev and copies them into `dist/` for a static host, instead of
 * keeping a 29 MB duplicate under `public/`.
 *
 * Run `yarn compile` before building, or proving has nothing to work with.
 */
function midnightZkAssets(): Plugin {
  const base = '/managed/tacitpay/';
  return {
    name: 'tacitpay:zk-assets',
    configureServer(server) {
      server.middlewares.use(base, (req, res, next) => {
        const relative = (req.url ?? '').replace(/^\/+/u, '').split('?')[0];
        if (!ZK_ASSET_DIRS.some((dir) => relative.startsWith(`${dir}/`))) return next();
        // Resolve against the managed dir and refuse anything that escapes it.
        const target = new URL(relative, MANAGED_DIR);
        if (!target.pathname.startsWith(fileURLToPath(MANAGED_DIR))) return next();
        res.setHeader('Content-Type', 'application/octet-stream');
        import('node:fs')
          .then(({ createReadStream }) => createReadStream(target).pipe(res))
          .catch(next);
      });
    },
    async closeBundle() {
      await Promise.all(
        ZK_ASSET_DIRS.map((dir) =>
          cp(new URL(`${dir}/`, MANAGED_DIR), new URL(`dist${base}${dir}/`, import.meta.url), {
            recursive: true,
          }).catch((error: unknown) => {
            // A UI-only build without compiled artifacts is still useful; proving is not.
            this.warn(`ZK artifacts not copied — run \`yarn compile\` first (${String(error)})`);
          }),
        ),
      );
    },
  };
}

export default defineConfig({
  // wasm() must run before the app plugins. The Midnight runtime and ledger ship
  // wasm-bindgen's bundler target, whose entry does
  // `import * as wasm from "./…_bg.wasm"; wasm.__wbindgen_start()` — WebAssembly ESM
  // integration, which Vite does not implement. Without this plugin the bundle builds
  // and the .wasm files are emitted, but the first chain read throws
  // "Cannot access '__wbindgen_start' before initialization" at runtime. Building is
  // not evidence that it runs.
  //
  // vite-plugin-top-level-await is deliberately NOT paired with it: that plugin
  // requires Rollup, and Vite 8 bundles with Rolldown. It is only needed for targets
  // without native top-level await, and `build.target` below is set past that.
  plugins: [wasm(), react(), tailwindcss(), midnightZkAssets()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@config': new URL('config', REPO_ROOT).pathname,
      // Midnight.js helpers (toHex, parseCoinPublicKeyToHex, …) are written against
      // Node's Buffer. The browser build supplies the userland implementation.
      buffer: 'buffer/',
    },
  },
  define: {
    // `midnight-js-*` reads process.env at module scope in a few places.
    'process.env': '{}',
  },
  build: {
    // wasm-bindgen's ESM output uses top-level await; do not lower the target below this.
    target: 'esnext',
    // The ledger and proving code is genuinely large; the marketing entry chunk is
    // what matters and it is split out separately.
    chunkSizeWarningLimit: 1_500,
  },
});
