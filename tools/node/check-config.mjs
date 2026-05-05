import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const expectedAccountId = 'e1d8076a3dc603837814ca828736561f';
const requiredEnvKeys = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PUBLIC_FALLBACK_IMAGE_URL',
  'PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID'
];

async function readText(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), 'utf8');
}

function assert(condition, message, issues) {
  if (!condition) {
    issues.push(message);
  }
}

function parseJson(content, filePath, issues) {
  try {
    return JSON.parse(content);
  } catch (error) {
    issues.push(`${filePath} is not valid JSON: ${error.message}`);
    return {};
  }
}

function includesAll(content, values) {
  return values.every((value) => content.includes(value));
}

const issues = [];

const packageJson = parseJson(await readText('package.json'), 'package.json', issues);
const scripts = packageJson.scripts ?? {};
assert(scripts.deploy === 'npm run build && bash scripts/deploy-worker.sh', 'package.json deploy script must keep manual Worker deploy flow', issues);
assert(!scripts.validate?.includes('copy:fix'), 'package.json validate must not run mutating copy:fix', issues);
assert(scripts.validate?.includes('config:check'), 'package.json validate must include config:check', issues);
assert(scripts['copy:check'] === 'npm run copy:lint', 'package.json copy:check must be non-mutating', issues);

const astroConfig = await readText('astro.config.mjs');
assert(astroConfig.includes("output: 'server'"), 'astro.config.mjs must keep server output for Worker API routes', issues);
assert(astroConfig.includes("@astrojs/cloudflare"), 'astro.config.mjs must use the Cloudflare adapter', issues);
assert(astroConfig.includes("site: 'https://sesicthub.co.ke'"), 'astro.config.mjs must keep the production site URL', issues);
assert(astroConfig.includes("assets: '_assets'"), 'astro.config.mjs must keep the configured asset directory', issues);

const wranglerConfig = parseJson(await readText('wrangler.jsonc'), 'wrangler.jsonc', issues);
assert(wranglerConfig.account_id === expectedAccountId, 'wrangler.jsonc account_id must match the locked Cloudflare account', issues);
assert(wranglerConfig.main === 'dist/_worker.js/index.js', 'wrangler.jsonc main must point at Astro Cloudflare worker output', issues);
assert(wranglerConfig.assets?.directory === 'dist', 'wrangler.jsonc assets.directory must point at dist', issues);
assert(wranglerConfig.kv_namespaces?.some((namespace) => namespace.binding === 'SESSION'), 'wrangler.jsonc must define the SESSION KV binding', issues);
assert(wranglerConfig.routes?.some((route) => route.pattern === 'sesicthub.co.ke' && route.custom_domain === true), 'wrangler.jsonc must keep the apex custom domain route', issues);

const envExample = await readText('.env.example');
assert(includesAll(envExample, requiredEnvKeys), '.env.example must list all required CI/deploy environment keys', issues);

const deployDocs = `${await readText('docs/deploy.md')}\n${await readText('docs/deployment.md')}`;
assert(includesAll(deployDocs, requiredEnvKeys), 'deployment docs must list all required CI/deploy environment keys', issues);

if (issues.length > 0) {
  console.error('check-config: configuration issues found');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('check-config: build, deploy, and env documentation look consistent');
