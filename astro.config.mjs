import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
    site: 'https://sesicthub.co.ke',
    output: 'server',
    adapter: cloudflare({
        configPath: './wrangler.build.jsonc',
        imageService: 'compile'
    }),
    session: {
        driver: sessionDrivers.memory()
    },
    build: {
        assets: '_assets'
    }
});
