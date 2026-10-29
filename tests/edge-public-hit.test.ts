import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgePublicHit } from '../src/lib/edge-public-hit';
import { withPublicCache } from '../src/server/public-cache';
import { publicRevision } from '../src/server/public-revision';
import { json } from '../src/server/http';
const origin = 'https://studio.example';
function store() {
  const data = new Map<string, Response>();
  return {
    data,
    match: async (key: RequestInfo | URL) =>
      data.get((key as Request).url)?.clone(),
    put: async (key: RequestInfo | URL, value: Response) => {
      data.set((key as Request).url, value.clone());
    },
  };
}
test('edge fast path reads the existing publication/content cache without running Next or database', async () => {
  const cache = store();
  const request = new Request(origin + '/api/home');
  let reads = 0;
  await withPublicCache(
    request,
    async () => {
      reads++;
      return json({ items: ['fresh'] });
    },
    cache,
    () =>
      publicRevision(
        origin,
        async () => '7',
        cache,
        () => 1000,
      ),
  );
  const result = await edgePublicHit(request, cache, origin, () => 2000);
  assert.equal(result?.headers.get('X-Public-Path'), 'edge');
  assert.equal(
    result?.headers.get('Cache-Control'),
    'public, max-age=0, must-revalidate',
  );
  assert.deepEqual(await result?.json(), { items: ['fresh'] });
  assert.equal(reads, 1);
  assert.equal(
    await edgePublicHit(request, cache, origin, () => 62000),
    undefined,
  );
});
test('private routes, credentials, cross-site requests and expired/missing cache always fall through', async () => {
  const cache = store();
  const denied = [
    new Request(origin + '/api/admin/enquiries'),
    new Request(origin + '/api/home', {
      headers: { cookie: 'session=secret' },
    }),
    new Request(origin + '/api/home', {
      headers: { authorization: 'Bearer secret' },
    }),
    new Request(origin + '/api/home', { method: 'POST' }),
    new Request(origin + '/api/home', {
      headers: { origin: 'https://other.example' },
    }),
    new Request(origin + '/api/home', {
      headers: { 'sec-fetch-site': 'cross-site' },
    }),
    new Request(origin + '/api/home?__publication=7'),
  ];
  const poison = {
    match: async () => {
      throw new Error('Must not rely on cache');
    },
  };
  for (const request of denied)
    assert.equal(await edgePublicHit(request, poison, origin), undefined);
  assert.equal(
    await edgePublicHit(new Request(origin + '/api/home'), cache, origin),
    undefined,
  );
});
