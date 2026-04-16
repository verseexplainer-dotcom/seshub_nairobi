#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CWD = process.cwd();

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
    bucket: null,
    missingOnly: false,
  };

  const args = argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--dry-run') opts.dryRun = true;
    if (arg === '--include-public-root') opts.includePublicRoot = true;
    if (arg === '--missing-only') opts.missingOnly = true;
    if (arg === '--bucket' && args[index + 1]) {
      opts.bucket = args[index + 1].trim();
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

async function listBucketFiles(supabase, bucket, prefix = '') {
  const files = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw new Error(`Unable to list ${bucket}/${prefix || ''}: ${error.message}`);
    }

    const entries = data || [];
    for (const entry of entries) {
      const nextPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFile = Boolean(entry.id) || Boolean(entry.metadata);
      if (isFile) {
        files.push(nextPath);
      } else {
        files.push(...await listBucketFiles(supabase, bucket, nextPath));
      }
    }

    if (entries.length < limit) break;
    offset += limit;
  }

  return files;
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

  const mappings = [
    {
      localDir: path.join(CWD, 'public', 'site-assets'),
      bucket: 'site-assets',
      keyPrefix: '',
    },
    {
      localDir: path.join(CWD, 'public', 'product-images'),
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

  if (options.bucket) {
    mappings.splice(
      0,
      mappings.length,
      ...mappings.filter((mapping) => mapping.bucket === options.bucket)
    );

    if (mappings.length === 0) {
      throw new Error(`Unsupported bucket filter '${options.bucket}'.`);
    }
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
  let totalSkippedExisting = 0;

  for (const mapping of mappings) {
    const hasDir = await ensureDirExists(mapping.localDir);
    if (!hasDir) {
      console.log(`Skipping missing directory: ${mapping.localDir}`);
      continue;
    }

    const files = await walkFiles(mapping.localDir);
    if (files.length === 0) {
      console.log(`No files found in ${mapping.localDir}`);
      continue;
    }

    console.log(`\nBucket: ${mapping.bucket}`);
    console.log(`Source: ${mapping.localDir}`);
    console.log(`Files discovered: ${files.length}`);

    totalDiscovered += files.length;
    const existingFiles = options.missingOnly ? new Set(await listBucketFiles(supabase, mapping.bucket)) : null;
    if (existingFiles) {
      console.log(`Existing remote files: ${existingFiles.size}`);
    }

    for (const absolutePath of files) {
      const relative = path.relative(mapping.localDir, absolutePath).split(path.sep).join('/');
      const objectPath = mapping.keyPrefix ? `${mapping.keyPrefix}/${relative}` : relative;

      if (existingFiles?.has(objectPath)) {
        totalSkippedExisting += 1;
        console.log(`SKIP  ${mapping.bucket}/${objectPath} (already exists)`);
        continue;
      }

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
  console.log(`Skipped existing: ${totalSkippedExisting}`);
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
