import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { publicCacheKey, withPublicCache } from '../src/server/public-cache';
import { json } from '../src/server/http';
import { createApi } from '../src/server/api';
import { homeFeeds, nextOffset, PUBLIC_STALE_MS } from '../src/lib/public-data';

const origin = 'http://localhost:3000';
const request = (path: string, init?: RequestInit) =>
  new Request(origin + path, init);
function memoryCache() {
  const values = new Map<string, Response>();
  return {
    match: async (key: RequestInfo | URL) =>
      values.get((key as Request).url)?.clone(),
    put: async (key: RequestInfo | URL, response: Response) => {
      values.set((key as Request).url, response.clone());
    },
    values,
  };
}

test('public edge cache avoids a second database read and isolates pagination and categories', async () => {
  const cache = memoryCache();
  let reads = 0;
  const load = async () => json({ read: ++reads });
  const first = await withPublicCache(
    request('/api/content/gallery?limit=12&offset=0'),
    load,
    cache,
  );
  assert.equal(first.headers.get('X-Public-Cache'), 'MISS');
  assert.equal(
    first.headers.get('Cache-Control'),
    'public, max-age=0, must-revalidate',
  );
  const second = await withPublicCache(
    request('/api/content/gallery?offset=0&limit=12'),
    load,
    cache,
  );
  assert.equal(second.headers.get('X-Public-Cache'), 'HIT');
  assert.equal(reads, 1);
  assert.deepEqual(await second.json(), { read: 1 });
  await withPublicCache(
    request('/api/content/gallery?offset=12&limit=12'),
    load,
    cache,
  );
  await withPublicCache(
    request('/api/content/gallery?offset=0&limit=12&category=Wedding'),
    load,
    cache,
  );
  assert.equal(reads, 3);
});

test('private routes, credentials, mutations, unknown parameters and errors stay out of public cache', async () => {
  const cache = memoryCache();
  for (const path of [
    '/api/admin/enquiries',
    '/api/admin/callbacks',
    '/api/auth/login',
    '/api/enquiries/123',
    '/api/telegram/retry',
    '/api/health',
    '/api/home?extra=1',
    '/api/content/gallery?limit=1&limit=2',
  ]) {
    const req = request(path);
    assert.equal(publicCacheKey(req), undefined);
    const response = await withPublicCache(
      req,
      async () => json({ private: true }),
      cache,
    );
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
  for (const init of [
    { headers: { cookie: 'studio_session=secret' } },
    { headers: { authorization: 'Bearer secret' } },
    { method: 'POST', headers: { origin } },
  ] as RequestInit[]) {
    assert.equal(publicCacheKey(request('/api/home', init)), undefined);
  }
  for (const status of [400, 401, 403, 404, 429, 503]) {
    await withPublicCache(
      request('/api/home'),
      async () => json({}, status),
      cache,
    );
  }
  await withPublicCache(
    request('/api/home'),
    async () => json({}, 200, { 'Set-Cookie': 'secret=x' }),
    cache,
  );
  assert.equal(cache.values.size, 0);
});

test('origin validation runs even on cache hits and cache failure falls back to live data', async () => {
  const cache = memoryCache();
  await withPublicCache(request('/api/home'), async () => json({}), cache);
  const denied = await withPublicCache(
    request('/api/home', { headers: { origin: 'https://foreign.test' } }),
    async () => {
      throw new Error('must not load');
    },
    cache,
  );
  assert.equal(denied.status, 403);
  const broken = {
    match: async () => {
      throw new Error('offline');
    },
    put: async () => {
      throw new Error('offline');
    },
  };
  const result = await withPublicCache(
    request('/api/home'),
    async () => json({ ok: true }),
    broken,
  );
  assert.equal(result.status, 200);
});

test('homepage aggregates four public previews with one service scope', async () => {
  let scopes = 0;
  const calls: string[] = [];
  const services = {
    content: {
      handle: async (
        req: Request,
        kind: string,
        id: undefined,
        admin: boolean,
      ) => {
        assert.equal(admin, false);
        assert.equal(id, undefined);
        calls.push(new URL(req.url).pathname + new URL(req.url).search);
        return json({ items: [{ _id: kind }] });
      },
    },
  } as unknown as Awaited<ReturnType<Parameters<typeof createApi>[0]>>;
  const api = createApi(async () => {
    scopes++;
    return services;
  });
  const response = await api(request('/api/home'));
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(await response.json()).sort(), [
    'gallery',
    'hero',
    'testimonials',
    'videos',
  ]);
  assert.deepEqual(calls.sort(), Object.keys(homeFeeds).sort());
  assert.equal(scopes, 1);
  assert.equal(
    (await api(request('/api/home', { method: 'POST', headers: { origin } })))
      .status,
    405,
  );
  assert.equal((await api(request('/api/home?extra=1'))).status, 400);
  assert.equal(scopes, 1);
});

test('concurrent homepage consumers and fresh navigation reuse one query; stale navigation reloads', async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
    },
  });
  let requests = 0;
  const options = {
    queryKey: ['public-home'],
    staleTime: PUBLIC_STALE_MS,
    queryFn: async () => {
      requests++;
      return { items: [] };
    },
  };
  await Promise.all(
    Array.from({ length: 4 }, () => client.fetchQuery(options)),
  );
  assert.equal(requests, 1);
  const observer = new QueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  await client.fetchQuery(options);
  assert.equal(requests, 1);
  unsubscribe();
  client.setQueryData(
    options.queryKey,
    { items: [] },
    { updatedAt: Date.now() - PUBLIC_STALE_MS - 1 },
  );
  await client.fetchQuery(options);
  assert.equal(requests, 2);
  client.clear();
});

test('pagination advances by returned count and ends without unnecessary empty fetches when metadata exists', () => {
  assert.equal(nextOffset({ items: [1, 2], hasMore: true }, 12, 12), 14);
  assert.equal(nextOffset({ items: [1, 2], hasMore: false }, 0, 2), undefined);
  assert.equal(nextOffset({ items: [], hasMore: true }, 12, 12), undefined);
  assert.equal(nextOffset({ items: [1, 2] }, 0, 2), 2);
});
