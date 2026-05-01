import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const requiredPaths = [
  '.editorconfig',
  '.env.example',
  'README.md',
  'ai/AGENTS.md',
  'ai/BRAND.md',
  'ai/GUARDRAILS.md',
  'ai/PROMPTS.md',
  'ai/SKILLS.md',
  'ai/AUDIT.md',
  'ai/TASKS.md',
  'ai/agents',
  'ai/codex',
  'ai/design',
  'ai/prompts',
  'ai/codex-skills',
  'docs/deploy.md',
  'docs/deployment.md',
  'docs/admin-auth-orders-rollout.md',
  'docs/architecture.md',
  'docs/api-map.md',
  'docs/content-rules.md',
  'docs/copy-examples.md',
  'docs/homepage-spec.md',
  'docs/product-page-spec.md',
  'docs/data-quality-rules.md',
  'ai/prompts/codex/build-component.md',
  'ai/prompts/codex/refactor-route.md',
  'ai/prompts/codex/content-humanizer.md',
  'ai/prompts/codex/audit-repo.md',
  'ai/prompts/codex/csv-cleaner.md',
  'ai/prompts/codex/image-matching.md',
  'tools/node/check-content.mjs',
  'tools/node/check-routes.mjs',
  'tools/node/check-env.mjs',
  'tools/node/repo_audit.mjs',
  'tools/node/copy-lint.js',
  'tools/node/copy-autofix.js',
  'tools/node/rewrite-map.json',
  'tools/python/link_images.py',
  'tools/python/import_products_csv.py',
  'tools/python/requirements.txt',
  'scripts/deploy-worker.sh',
  'src/components',
  'src/layouts',
  'src/lib',
  'src/pages',
  'src/styles',
  'src/content',
  'supabase/schema.sql',
  'supabase/policies.sql',
  'supabase/migrations',
  'public/site-assets'
];

async function pathExists(relativePath) {
  try {
    await fs.access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

const missing = [];

for (const requiredPath of requiredPaths) {
  if (!(await pathExists(requiredPath))) {
    missing.push(requiredPath);
  }
}

if (missing.length === 0) {
  console.log('repo-audit: expected structure is present');
  process.exit(0);
}

console.error('repo-audit: missing expected paths');
for (const item of missing) {
  console.error(`- ${item}`);
}

process.exit(1);
