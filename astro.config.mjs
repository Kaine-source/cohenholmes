// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Required for @astrojs/rss (src/pages/rss.xml.js) to emit absolute item URLs.
  site: 'https://cohenholmes.co.uk',
  redirects: {
    '/writing': '/blog',
  },
});
