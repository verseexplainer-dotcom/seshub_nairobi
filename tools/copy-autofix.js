import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const rewriteMapPath = path.join(rootDir, 'tools', 'rewrite-map.json');
const targetExtensions = new Set(['.astro', '.ts', '.tsx', '.js', '.jsx', '.md']);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function readRewriteMap() {
  const raw = await fs.readFile(rewriteMapPath, 'utf8');
  const parsed = JSON.parse(raw);
  const replacements = Array.isArray(parsed.replacements) ? parsed.replacements : [];

  return replacements
    .filter((entry) => entry && typeof entry.search === 'string' && typeof entry.replace === 'string')
    .sort((left, right) => right.search.length - left.search.length);
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (targetExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function applyReplacements(content, replacements) {
  let updated = content;

  for (const replacement of replacements) {
    const pattern = new RegExp(escapeRegExp(replacement.search), 'gi');
    updated = updated.replace(pattern, replacement.replace);
  }

  return updated;
}

async function main() {
  const replacements = await readRewriteMap();
  const files = await collectFiles(srcDir);
  const changedFiles = [];

  for (const filePath of files) {
    const original = await fs.readFile(filePath, 'utf8');
    const updated = applyReplacements(original, replacements);

    if (updated === original) {
      continue;
    }

    await fs.writeFile(filePath, updated, 'utf8');
    changedFiles.push(path.relative(rootDir, filePath));
  }

  if (changedFiles.length === 0) {
    console.log('copy-autofix: no files updated');
    return;
  }

  console.log('copy-autofix: updated files');
  for (const file of changedFiles) {
    console.log(`- ${file}`);
  }
}

main().catch((error) => {
  console.error('copy-autofix failed');
  console.error(error);
  process.exit(1);
});
