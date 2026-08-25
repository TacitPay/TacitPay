// Flat config: ESLint 10 + typescript-eslint 8 (PRD §13: ESLint + Prettier, TS strict).
// Scoped to TypeScript sources for now; framework-specific rule sets arrive with
// the real UI/API implementation work.
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'contracts/managed/**',
      '.yarn/**',
      '.firecrawl/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [tseslint.configs.recommended],
  },
);
