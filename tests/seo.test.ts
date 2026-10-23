import test from 'node:test';
import assert from 'node:assert/strict';
import { pageMetadata, publicPages } from '../src/config/seo';
import sitemap from '../src/app/sitemap';
import robots from '../src/app/robots';

test('public SEO pages have distinct metadata and matching sitemap canonicals', () => {
  const entries = sitemap();
  const titles = new Set<string>();
  for (const path of Object.keys(publicPages) as (keyof typeof publicPages)[]) {
    const meta = pageMetadata(path);
    assert.deepEqual(meta.robots, { index: true, follow: true });
    assert.equal(meta.alternates?.canonical, path);
    assert.equal(meta.openGraph?.url, path);
    assert.ok(entries.some((entry) => new URL(entry.url).pathname === path));
    assert.ok(meta.description);
    titles.add(String(meta.title));
  }
  assert.equal(titles.size, entries.length);
  assert.ok(
    entries.every(
      (entry) =>
        !/\/(admin|book|thank-you|api)(\/|$)/.test(new URL(entry.url).pathname),
    ),
  );
});

test('robots allows reading noindex pages and excludes API endpoints', () => {
  assert.deepEqual(robots().rules, {
    userAgent: '*',
    allow: '/',
    disallow: ['/api/'],
  });
});
