// Flat config: ESLint 10 + typescript-eslint 8 (PRD §13: ESLint + Prettier, TS strict).
// Scoped to TypeScript sources for now; framework-specific rule sets arrive with
// the real UI/API implementation work.
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '.vercel/**',
      '**/node_modules/**',
      '**/dist/**',
      'contracts/managed/**',
      '.yarn/**',
      '.firecrawl/**',
      // Astro's generated type cache (packages/docs)
      '**/.astro/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [tseslint.configs.recommended],
  },
);
