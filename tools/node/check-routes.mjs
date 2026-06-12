import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const pagesDir = path.join(rootDir, 'src', 'pages');
const apiDir = path.join(pagesDir, 'api');

const requiredPages = [
  'src/pages/index.astro',
  'src/pages/shop.astro',
  'src/pages/search.astro',
  'src/pages/cart.astro',
  'src/pages/category/[slug].astro',
  'src/pages/product/[slug].astro'
];

const requiredApiRoutes = [
  'src/pages/api/checkout/whatsapp.ts',
  'src/pages/api/newsletter.ts',
  'src/pages/api/search/suggest.ts',
  'src/pages/api/auth/callback.ts',
  'src/pages/api/auth/login.ts',
  'src/pages/api/auth/logout.ts',
  'src/pages/api/auth/reset-password.ts',
  'src/pages/api/auth/sign-up.ts',
  'src/pages/api/auth/update-password.ts',
  'src/pages/api/account/profile.ts',
  'src/pages/api/admin/orders/[id]/note.ts',
  'src/pages/api/admin/orders/[id]/status.ts',
  'src/pages/api/admin/users/[id]/active.ts',
  'src/pages/api/admin/users/[id]/role.ts'
];

async function exists(relativePath) {
  try {
    await fs.access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function collectDirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const dirs = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (!entry.isDirectory()) {
      continue;
    }

    dirs.push(fullPath);
    dirs.push(...(await collectDirs(fullPath)));
  }

  return dirs;
}

const missing = [];

for (const route of [...requiredPages, ...requiredApiRoutes]) {
  if (!(await exists(route))) {
    missing.push(route);
  }
}

const dirs = await collectDirs(pagesDir);
const misplacedApiDirs = dirs
  .filter((dir) => path.basename(dir) === 'api' && dir !== apiDir)
  .map((dir) => path.relative(rootDir, dir));

if (missing.length === 0 && misplacedApiDirs.length === 0) {
  console.log('check-routes: required pages and API route placement look good');
  process.exit(0);
}

if (missing.length > 0) {
  console.error('check-routes: missing required routes');
  for (const route of missing) {
    console.error(`- ${route}`);
  }
}

if (misplacedApiDirs.length > 0) {
  console.error('check-routes: API directories must stay under src/pages/api');
  for (const dir of misplacedApiDirs) {
    console.error(`- ${dir}`);
  }
}

process.exit(1);

