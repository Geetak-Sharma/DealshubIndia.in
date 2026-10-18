import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://dealshubindia.in',
  security: {
    checkOrigin: false
  },
  integrations: [sitemap(), react(), svelte(), tailwind({ applyBaseStyles: false })],
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    ssr: {
      external: ['react', 'react-dom']
    }
  }
});
