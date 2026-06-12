import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const envFiles = ['.env', '.env.local'];

const requiredRuntimeKeys = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const recommendedKeys = [
  'PUBLIC_FALLBACK_IMAGE_URL',
  'PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_NOTIFY_TO',
  'CLOUDFLARE_API_TOKEN'
];

function parseEnv(content) {
  const values = new Map();

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (key) {
      values.set(key, value);
    }
  }

  return values;
}

async function readEnvValues() {
  const values = new Map();

  for (const key of Object.keys(process.env)) {
    values.set(key, process.env[key] ?? '');
  }

  for (const file of envFiles) {
    try {
      const content = await fs.readFile(path.join(rootDir, file), 'utf8');
      for (const [key, value] of parseEnv(content)) {
        values.set(key, value);
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return values;
}

const values = await readEnvValues();
const missingRequired = requiredRuntimeKeys.filter((key) => !values.get(key));
const missingRecommended = recommendedKeys.filter((key) => !values.get(key));

if (missingRequired.length > 0) {
  console.error('check-env: missing required runtime keys');
  for (const key of missingRequired) {
    console.error(`- ${key}`);
  }
}

if (missingRecommended.length > 0) {
  console.warn('check-env: missing recommended keys');
  for (const key of missingRecommended) {
    console.warn(`- ${key}`);
  }
}

if (missingRequired.length > 0) {
  process.exit(1);
}

console.log('check-env: required runtime keys are present');
