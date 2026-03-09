import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeProductDescription } from '../src/lib/sanitize';

test('sanitizeProductDescription removes unsafe tags and protocols', () => {
  const output = sanitizeProductDescription(
    `<p>Hello</p><script>alert('xss')</script><a href="javascript:alert('x')">click</a>`
  );

  assert.match(output, /<p>Hello<\/p>/);
  assert.doesNotMatch(output, /<script>/);
  assert.doesNotMatch(output, /javascript:/i);
});

test('sanitizeProductDescription keeps allowed formatting tags', () => {
  const output = sanitizeProductDescription('<p><strong>Bold</strong> <em>copy</em></p>');

  assert.match(output, /<strong>Bold<\/strong>/);
  assert.match(output, /<em>copy<\/em>/);
});
