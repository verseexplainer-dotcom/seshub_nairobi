import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHomepageTestimonials, countExplicitBrands } from '../src/lib/homepage';

test('homepage testimonials stay hidden when there are no approved rows', () => {
  assert.deepEqual(buildHomepageTestimonials([]), []);
  assert.deepEqual(buildHomepageTestimonials(undefined), []);
});

test('homepage testimonials dedupe duplicate approved rows and cap output', () => {
  const testimonials = buildHomepageTestimonials([
    { id: 1, name: 'Jane Doe', persona: 'student', rating: 5, quote: 'Great service.' },
    { id: 2, name: 'Jane Doe', persona: 'student', rating: 4, quote: 'Great service.' },
    { id: 3, name: 'Alex', persona: 'office', rating: 5, quote: 'Helpful team.' }
  ]);

  assert.equal(testimonials.length, 2);
  assert.equal(testimonials[0]?.name, 'Jane Doe');
  assert.equal(testimonials[1]?.name, 'Alex');
});

test('homepage brand counts ignore missing brands and title text', () => {
  const count = countExplicitBrands([
    { title: 'HP EliteBook 840 G5', brand: '' },
    { title: 'Dell Latitude 7420' },
    { title: 'Lenovo ThinkPad T14', brand: 'Lenovo' },
    { title: 'HP ProBook 640', brand: 'HP' },
    { title: 'HP ProBook 450', brand: 'HP' }
  ]);

  assert.equal(count, 2);
});
