import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  publishContent,
  ContentPublication,
  type PublicationRecord,
} from '../src/server/content-publication';
import { publicRevision } from '../src/server/public-revision';
import { withPublicCache } from '../src/server/public-cache';
import { json } from '../src/server/http';
import type { Collection } from 'mongodb';
const origin = 'https://lite.example.test';
const secret = 'x'.repeat(32);
function cacheStore() {
  const values = new Map<string, Response>();
  return {
    values,
    match: async (key: RequestInfo | URL) =>
      values.get((key as Request).url)?.clone(),
    put: async (key: RequestInfo | URL, value: Response) => {
      values.set((key as Request).url, value.clone());
    },
  };
}

test('publishing rejects absent/incorrect credentials and disabled configuration before database access', async () => {
  let writes = 0;
  const publish = async () => {
    writes++;
    return '1';
  };
  for (const auth of ['', 'Bearer wrong', 'Bearer ' + 'y'.repeat(32)]) {
    const response = await publishContent(
      new Request(origin, { method: 'POST', headers: { authorization: auth } }),
      publish,
      secret,
    );
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
  assert.equal(
    (await publishContent(new Request(origin, { method: 'POST' }), publish, ''))
      .status,
    503,
  );
  assert.equal(
    (await publishContent(new Request(origin), publish, secret)).status,
    405,
  );
  assert.equal(writes, 0);
  const response = await publishContent(
    new Request(origin, {
      method: 'POST',
      headers: { authorization: 'Bearer ' + secret },
    }),
    publish,
    secret,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    revision: '1',
    edgeRefreshSeconds: 60,
    browserRefreshRequired: true,
  });
  assert.equal(writes, 1);
});

test('publication failures remain private and do not disclose secrets', async () => {
  const result = await publishContent(
    new Request(origin, {
      method: 'POST',
      headers: { authorization: 'Bearer ' + secret },
    }),
    async () => {
      throw new Error(secret);
    },
    secret,
  );
  assert.equal(result.status, 503);
  assert.equal((await result.text()).includes(secret), false);
});

test('independent edge locations adopt a published revision after bounded expiry and never reuse old content keys', async () => {
  const edges = [cacheStore(), cacheStore()];
  let time = 1000,
    revision = '0',
    reads = 0,
    contentReads = 0;
  const read = async () => {
    reads++;
    return revision;
  };
  const request = new Request(origin + '/api/home');
  const visit = (cache: ReturnType<typeof cacheStore>) =>
    withPublicCache(
      request,
      async () => json({ value: ++contentReads }),
      cache,
      () => publicRevision(origin, read, cache, () => time),
    );
  for (const edge of edges) await visit(edge);
  assert.equal(reads, 2);
  assert.equal(contentReads, 2);
  revision = '1';
  for (const edge of edges)
    assert.equal((await visit(edge)).headers.get('X-Public-Cache'), 'HIT');
  assert.equal(reads, 2);
  time += 60001;
  for (const edge of edges) {
    const response = await visit(edge);
    assert.equal(response.headers.get('X-Public-Cache'), 'MISS');
    assert.equal(
      response.headers.get('Cache-Control'),
      'public, max-age=0, must-revalidate',
    );
    assert.ok(
      [...edge.values.keys()].some((key) => key.includes('__publication=1')),
    );
  }
  assert.equal(reads, 4);
  assert.equal(contentReads, 4);
});

test('unavailable revision bypasses cached content and leaves live response uncached', async () => {
  const cache = cacheStore();
  const req = new Request(origin + '/api/home');
  await withPublicCache(
    req,
    async () => json({ value: 'old' }),
    cache,
    async () => '1',
  );
  const result = await withPublicCache(
    req,
    async () => json({ value: 'live' }),
    cache,
    async () => {
      throw new Error('offline');
    },
  );
  assert.deepEqual(await result.json(), { value: 'live' });
  assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(cache.values.size, 1);
});

test('publish uses atomic increments so repeated commands cannot revive an earlier namespace', async () => {
  let revision = 0;
  const records = {
    findOne: async () => (revision ? { revision } : null),
    findOneAndUpdate: async (
      filter: unknown,
      update: unknown,
      options: unknown,
    ) => {
      assert.deepEqual(filter, { _id: 'public-content' });
      assert.equal((update as { $inc: { revision: number } }).$inc.revision, 1);
      assert.deepEqual(options, { upsert: true, returnDocument: 'after' });
      return { revision: ++revision };
    },
  } as unknown as Collection<PublicationRecord>;
  const publication = new ContentPublication(records);
  assert.equal(await publication.current(), '0');
  assert.deepEqual(
    await Promise.all([publication.publish(), publication.publish()]),
    ['1', '2'],
  );
  assert.equal(await publication.current(), '2');
});
