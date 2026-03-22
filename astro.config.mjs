import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';
import svelte from '@astrojs/svelte';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    site: 'https://dealshubindia.in',
    integrations: [sitemap(), react(), svelte()],
    output: 'server',
    adapter: node({
      mode: 'standalone'
    })
});