#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();
const RENAMED_COPY_RE = /\s+\(\d+\)(\.[^./]+)$/;

function parseEnvFile(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }
  return env;
}

async function loadLocalEnvFiles() {
  const envFiles = ['.env', '.env.local'];
  for (const filename of envFiles) {
    const filePath = path.join(CWD, filename);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = parseEnvFile(content);
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

function decodeProjectRefFromServiceKey(serviceKey) {
  if (!serviceKey || !serviceKey.includes('.')) return null;
  const parts = serviceKey.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return typeof parsed?.ref === 'string' ? parsed.ref : null;
  } catch {
    return null;
  }
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.webp':
      return 'image/webp';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.gif':
      return 'image/gif';
    case '.ico':
      return 'image/x-icon';
    case '.avif':
      return 'image/avif';
    case '.json':
    case '.webmanifest':
      return 'application/manifest+json';
    case '.txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

async function walkFiles(dirPath) {
  const result = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        result.push(absolute);
      }
    }
  }

  await walk(dirPath);
  result.sort((a, b) => a.localeCompare(b));
  return result;
}

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    includePublicRoot: false,
    productImagesDir: '',
    skipRenamedCopies: true,
  };

  const args = argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--dry-run') opts.dryRun = true;
    if (arg === '--include-public-root') opts.includePublicRoot = true;
    if (arg === '--include-renamed-copies') opts.skipRenamedCopies = false;
    if (arg === '--product-images-dir' && args[index + 1]) {
      opts.productImagesDir = args[index + 1];
      index += 1;
    }
  }

  return opts;
}

function bytesToHuman(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

async function ensureDirExists(dirPath) {
  try {
    const info = await fs.stat(dirPath);
    return info.isDirectory();
  } catch {
    return false;
  }
}

async function resolveProductImagesDir(options) {
  const configured = (options.productImagesDir || process.env.PRODUCT_IMAGES_SOURCE_DIR || '').trim();
  if (configured) {
    const absolute = path.isAbsolute(configured) ? configured : path.join(CWD, configured);
    return { dir: absolute, source: 'configured' };
  }

  const preferred = path.join(CWD, '.catalog-assets', 'product-images');
  if (await ensureDirExists(preferred)) {
    return { dir: preferred, source: 'catalog-assets' };
  }

  const legacy = path.join(CWD, 'public', 'product-images');
  if (await ensureDirExists(legacy)) {
    console.log(
      'Using legacy product image source at public/product-images. Set PRODUCT_IMAGES_SOURCE_DIR or use --product-images-dir to upload from a gitignored staging folder instead.'
    );
    return { dir: legacy, source: 'legacy-public' };
  }

  return { dir: preferred, source: 'catalog-assets' };
}

function shouldSkipProductImage(relativePath, options) {
  if (!options.skipRenamedCopies) return false;
  return RENAMED_COPY_RE.test(path.basename(relativePath));
}

async function main() {
  const options = parseArgs(process.argv);
  await loadLocalEnvFiles();

  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  let url = (process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env or .env.local');
  }

  if (!url) {
    const ref = decodeProjectRefFromServiceKey(serviceKey);
    if (!ref) {
      throw new Error('Missing PUBLIC_SUPABASE_URL and could not derive project ref from service role key.');
    }
    url = `https://${ref}.supabase.co`;
    console.log(`Using derived Supabase URL from service-role key ref: ${url}`);
  }

  const productImagesSource = await resolveProductImagesDir(options);
  const mappings = [
    {
      localDir: path.join(CWD, 'public', 'site-assets'),
      bucket: 'site-assets',
      keyPrefix: '',
    },
    {
      localDir: productImagesSource.dir,
      bucket: 'product-images',
      keyPrefix: '',
    },
  ];

  if (options.includePublicRoot) {
    mappings.push({
      localDir: path.join(CWD, 'public'),
      bucket: 'site-assets',
      keyPrefix: 'public-root',
    });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    throw new Error(`Unable to list buckets: ${bucketError.message}`);
  }

  const bucketNames = new Set((buckets || []).map((bucket) => bucket.name));
  for (const mapping of mappings) {
    if (!bucketNames.has(mapping.bucket)) {
      throw new Error(`Bucket '${mapping.bucket}' does not exist in this Supabase project.`);
    }
  }

  let totalDiscovered = 0;
  let totalUploaded = 0;
  let totalFailed = 0;
  let totalBytes = 0;
  let totalSkippedRenamedCopies = 0;

  for (const mapping of mappings) {
    const hasDir = await ensureDirExists(mapping.localDir);
    if (!hasDir) {
      console.log(`Skipping missing directory: ${mapping.localDir}`);
      continue;
    }

    const discoveredFiles = await walkFiles(mapping.localDir);
    const files =
      mapping.bucket === 'product-images'
        ? discoveredFiles.filter((absolutePath) => {
            const relativePath = path
              .relative(mapping.localDir, absolutePath)
              .split(path.sep)
              .join('/');
            const shouldSkip = shouldSkipProductImage(relativePath, options);
            if (shouldSkip) totalSkippedRenamedCopies += 1;
            return !shouldSkip;
          })
        : discoveredFiles;

    if (files.length === 0) {
      console.log(`No files found in ${mapping.localDir}`);
      continue;
    }

    console.log(`\nBucket: ${mapping.bucket}`);
    console.log(`Source: ${mapping.localDir}`);
    console.log(`Files discovered: ${discoveredFiles.length}`);
    if (mapping.bucket === 'product-images' && discoveredFiles.length !== files.length) {
      console.log(`Skipped renamed copies: ${discoveredFiles.length - files.length}`);
    }
    console.log(`Files selected: ${files.length}`);

    totalDiscovered += files.length;

    for (const absolutePath of files) {
      const relative = path.relative(mapping.localDir, absolutePath).split(path.sep).join('/');
      const objectPath = mapping.keyPrefix ? `${mapping.keyPrefix}/${relative}` : relative;

      if (options.dryRun) {
        console.log(`[dry-run] ${absolutePath} -> ${mapping.bucket}/${objectPath}`);
        continue;
      }

      const data = await fs.readFile(absolutePath);
      totalBytes += data.byteLength;

      const { error: uploadError } = await supabase.storage
        .from(mapping.bucket)
        .upload(objectPath, data, {
          upsert: true,
          contentType: guessContentType(absolutePath),
          cacheControl: '31536000',
        });

      if (uploadError) {
        totalFailed += 1;
        console.log(`FAIL  ${mapping.bucket}/${objectPath} (${uploadError.message})`);
      } else {
        totalUploaded += 1;
        console.log(`OK    ${mapping.bucket}/${objectPath}`);
      }
    }
  }

  console.log('\nSummary');
  console.log(`Discovered: ${totalDiscovered}`);
  if (totalSkippedRenamedCopies > 0) {
    console.log(`Skipped renamed copies: ${totalSkippedRenamedCopies}`);
  }
  if (options.dryRun) {
    console.log('Dry-run mode: no uploads performed.');
    return;
  }

  console.log(`Uploaded:   ${totalUploaded}`);
  console.log(`Failed:     ${totalFailed}`);
  console.log(`Bytes sent: ${bytesToHuman(totalBytes)}`);

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`\nUpload failed: ${error.message}`);
  process.exit(1);
});
