import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
    site: 'https://sesicthub.co.ke',
    output: 'server',
    adapter: cloudflare(),
    session: {
        driver: 'memory'
    },
    build: {
        assets: '_assets'
    }
});
