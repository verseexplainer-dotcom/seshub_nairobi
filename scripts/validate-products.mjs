import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'src', 'data', 'products_final.json');
const imageRoot = path.join(root, 'public', 'product-images');

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isFullUrl(value) {
  return /^https?:\/\//i.test(value);
}

function localImagePath(value) {
  const image = asText(value);
  if (!image || isFullUrl(image)) return null;
  const normalized = image
    .replace(/^\/?product-images\//, '')
    .replace(/^\/?products\//, '')
    .replace(/^\//, '');
  return normalized ? path.join(imageRoot, normalized) : null;
}

function getImages(product) {
  return [
    ...(Array.isArray(product.image_overrides) ? product.image_overrides.map(asText) : []),
    ...(Array.isArray(product.images) ? product.images.map(asText) : []),
    ...(Array.isArray(product.Images) ? product.Images.map(asText) : []),
    asText(product.image_file),
    ...(Array.isArray(product.image_alternates) ? product.image_alternates.map(asText) : [])
  ].filter(Boolean);
}

function getProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

const payload = JSON.parse(readFileSync(dataPath, 'utf8'));
const products = getProducts(payload);
const issues = [];
const unmatchedImages = [];
const alternateImageMatches = [];
const seenSlugs = new Set();

products.forEach((product, index) => {
  const slug = asText(product['URL Slug'] ?? product.slug);
  const title = asText(product['Product Name'] ?? product.title ?? product.name);
  const price = product['Price (KES)'] ?? product.price_kes ?? product.price;
  const condition = asText(product.Condition ?? product.condition).toLowerCase().replace(/[\s-]+/g, '_');
  const images = getImages(product);

  if (!slug) {
    issues.push({ index, field: 'slug', product: title || `(row ${index + 1})` });
  } else if (seenSlugs.has(slug)) {
    issues.push({ index, field: 'duplicate slug', product: slug });
  } else {
    seenSlugs.add(slug);
  }

  if (!title) {
    issues.push({ index, field: 'title', product: slug || `(row ${index + 1})` });
  }

  if (price === null || price === undefined || price === '' || !Number.isFinite(Number(price)) || Number(price) <= 0) {
    issues.push({ index, field: 'price', product: slug || title || `(row ${index + 1})`, value: price });
  }

  if (condition !== 'brand_new' && condition !== 'refurbished') {
    issues.push({ index, field: 'condition', product: slug || title || `(row ${index + 1})`, value: product.Condition ?? product.condition });
  }

  if (images.length === 0) {
    issues.push({ index, field: 'image', product: slug || title || `(row ${index + 1})` });
    return;
  }

  const category = asText(
    Array.isArray(product.categories) && product.categories.length > 0
      ? product.categories[0]
      : product.Category ?? product.category
  );
  if (!category) {
    issues.push({ index, field: 'category', product: slug || title || `(row ${index + 1})` });
  }

  const localCandidates = images
    .map((image) => ({ image, filePath: localImagePath(image) }))
    .filter((candidate) => candidate.filePath !== null);
  const hasRemoteOnlyImage = images.some(isFullUrl);
  const existingLocal = localCandidates.find((candidate) => existsSync(candidate.filePath));

  if (!existingLocal && !hasRemoteOnlyImage) {
    unmatchedImages.push({
      product: slug || title || `(row ${index + 1})`,
      images
    });
  } else if (existingLocal && existingLocal.image !== images[0]) {
    alternateImageMatches.push({
      product: slug || title || `(row ${index + 1})`,
      primary: images[0],
      matched: existingLocal.image
    });
  }
});

const summary = {
  products: products.length,
  issues: issues.length,
  unmatched_images: unmatchedImages.length,
  alternate_image_matches: alternateImageMatches.length
};

console.log(JSON.stringify(summary, null, 2));

if (issues.length > 0) {
  console.log('\nProduct data issues:');
  for (const issue of issues.slice(0, 50)) {
    console.log(`- ${issue.product}: missing/invalid ${issue.field}${issue.value !== undefined ? ` (${issue.value})` : ''}`);
  }
}

if (unmatchedImages.length > 0) {
  console.log('\nUnmatched local images:');
  for (const item of unmatchedImages.slice(0, 50)) {
    console.log(`- ${item.product}: ${item.images.join(', ')}`);
  }
}

if (alternateImageMatches.length > 0) {
  console.log('\nPrimary image missing, alternate exists:');
  for (const item of alternateImageMatches.slice(0, 50)) {
    console.log(`- ${item.product}: primary=${item.primary}; matched=${item.matched}`);
  }
}

if (issues.length > 0 || unmatchedImages.length > 0) {
  process.exitCode = 1;
}
