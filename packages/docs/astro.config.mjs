import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// docs.tacitpay.xyz — Starlight on Astro, themed to the product's own tokens
// (src/styles/theme.css) so the docs, the landing and the app share one face.
export default defineConfig({
  site: 'https://docs.tacitpay.xyz',
  integrations: [
    starlight({
      title: 'TacitPay',
      description:
        'Private invoicing & settlement on Midnight — private by default, provable on demand.',
      logo: {
        light: './src/assets/logo.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: true,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/TacitPay/TacitPay' },
        { icon: 'rocket', label: 'Open the app', href: 'https://app.tacitpay.xyz' },
      ],
      // The same faces the app bundles, served from this origin — a docs site
      // for a privacy product should not announce its visitors to a font CDN.
      customCss: [
        '@fontsource/instrument-sans/400.css',
        '@fontsource/instrument-sans/500.css',
        '@fontsource/instrument-sans/600.css',
        '@fontsource/ibm-plex-mono/400.css',
        '@fontsource/ibm-plex-mono/500.css',
        './src/styles/theme.css',
      ],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Introduction', slug: '' },
            { label: 'Whitepaper', slug: 'whitepaper' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'The disclosure line', slug: 'concepts/disclosure' },
            { label: 'Invoice lifecycle', slug: 'concepts/lifecycle' },
            { label: 'Invoice links', slug: 'concepts/links' },
            { label: 'Settlement lanes', slug: 'concepts/lanes' },
            { label: 'What TacitPay cannot see', slug: 'concepts/cannot-see' },
          ],
        },
        {
          label: 'Architecture',
          items: [
            { label: 'System overview', slug: 'architecture/overview' },
            { label: 'The contract', slug: 'architecture/contract' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Use the app', slug: 'guides/app' },
            { label: 'Use the CLI', slug: 'guides/cli' },
            { label: 'Run it locally', slug: 'guides/local' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Networks & deployments', slug: 'reference/networks' },
            { label: 'FAQ & limitations', slug: 'reference/faq' },
            { label: 'Roadmap', slug: 'reference/roadmap' },
          ],
        },
      ],
    }),
  ],
});
