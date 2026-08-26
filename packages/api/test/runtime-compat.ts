import { existsSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

let installed = false;

/**
 * Midnight.js 4.1.1 pins onchain-runtime 3.0.0 while compact-runtime 0.16 accepts
 * 3.1.0. A single process must use one WASM class instance or StateValue checks fail.
 */
export const installMidnightRuntimeCompatibility = (): void => {
  if (installed) return;
  const require = createRequire(import.meta.url);
  const protocolDirectory = dirname(
    require.resolve('@midnight-ntwrk/midnight-js-protocol/package.json'),
  );
  const protocolRuntime = join(
    protocolDirectory,
    'node_modules/@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm_fs.js',
  );
  if (!existsSync(protocolRuntime)) return;

  const protocolRuntimeUrl = pathToFileURL(protocolRuntime).href;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === '@midnight-ntwrk/onchain-runtime-v3') {
        return { shortCircuit: true, url: protocolRuntimeUrl };
      }
      return nextResolve(specifier, context);
    },
  });
  installed = true;
};
