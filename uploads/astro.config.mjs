import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://felinamor.com',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'always'
  },
  server: {
    port: 4321
  }
});
