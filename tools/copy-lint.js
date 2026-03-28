import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const targetExtensions = new Set(['.astro', '.ts', '.tsx', '.js', '.jsx', '.md']);

const bannedWords = ['flow', 'journey', 'optimize', 'optimise', 'seamless', 'shortlist', 'switch', 'process'];
const bannedPhrases = ['switch to whatsapp', 'browse on-site', 'decision-making flow'];

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

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isHumanFacingSnippet(value) {
  const snippet = normalizeWhitespace(value);

  if (!snippet || snippet.length < 3) {
    return false;
  }

  if (!/[A-Za-z]/.test(snippet)) {
    return false;
  }

  if (/^(?:\.{0,2}\/|\/)/.test(snippet)) {
    return false;
  }

  if (/^(?:https?:|mailto:|tel:)/i.test(snippet)) {
    return false;
  }

  if (/var\(--|rgba?\(|calc\(|=>|[{};]/.test(snippet)) {
    return false;
  }

  if (/^[A-Za-z0-9._/-]+$/.test(snippet) && !snippet.includes(' ')) {
    return false;
  }

  if (/^[a-z0-9_-]+$/i.test(snippet) && !snippet.includes(' ') && snippet === snippet.toLowerCase()) {
    return false;
  }

  return true;
}

function extractQuotedStrings(content) {
  const snippets = [];
  const pattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const quote = match[1];
    const value = match[2];
    if (quote === '`' && value.includes('${')) {
      continue;
    }
    if (isHumanFacingSnippet(value)) {
      snippets.push(normalizeWhitespace(value));
    }
  }

  return snippets;
}

function extractTagText(content) {
  const snippets = [];
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---/, ' ');
  const withoutScripts = withoutFrontmatter
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const pattern = />\s*([^<>{}]+?)\s*</g;
  let match;

  while ((match = pattern.exec(withoutScripts)) !== null) {
    const value = normalizeWhitespace(match[1]);
    if (isHumanFacingSnippet(value)) {
      snippets.push(value);
    }
  }

  return snippets;
}

function extractMarkdownText(content) {
  const snippets = [];
  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, ' ');

  for (const line of withoutCodeBlocks.split('\n')) {
    const cleaned = normalizeWhitespace(line.replace(/^#+\s*/, '').replace(/^[-*]\s*/, ''));
    if (isHumanFacingSnippet(cleaned)) {
      snippets.push(cleaned);
    }
  }

  return snippets;
}

function extractSnippets(content, extension) {
  const snippets = new Set();

  for (const snippet of extractQuotedStrings(content)) {
    snippets.add(snippet);
  }

  if (extension === '.astro') {
    for (const snippet of extractTagText(content)) {
      snippets.add(snippet);
    }
  }

  if (extension === '.md') {
    for (const snippet of extractMarkdownText(content)) {
      snippets.add(snippet);
    }
  }

  return Array.from(snippets);
}

function findMatches(snippets) {
  const matches = [];

  for (const snippet of snippets) {
    const lowered = snippet.toLowerCase();

    for (const phrase of bannedPhrases) {
      if (lowered.includes(phrase)) {
        matches.push({ type: 'phrase', term: phrase, snippet });
      }
    }

    for (const word of bannedWords) {
      const pattern = new RegExp(`\\b${word}\\b`, 'i');
      if (pattern.test(snippet)) {
        matches.push({ type: 'word', term: word, snippet });
      }
    }
  }

  return matches;
}

async function main() {
  const files = await collectFiles(srcDir);
  const issues = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    const snippets = extractSnippets(content, path.extname(filePath));
    const matches = findMatches(snippets);

    if (matches.length > 0) {
      issues.push({
        filePath: path.relative(rootDir, filePath),
        matches
      });
    }
  }

  if (issues.length === 0) {
    console.log('copy-lint: no banned copy found');
    return;
  }

  console.error('copy-lint: banned copy found');
  for (const issue of issues) {
    console.error(`- ${issue.filePath}`);
    for (const match of issue.matches) {
      console.error(`  ${match.type}:${match.term} -> ${match.snippet}`);
    }
  }

  process.exit(1);
}

main().catch((error) => {
  console.error('copy-lint failed');
  console.error(error);
  process.exit(1);
});
