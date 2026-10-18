import test from 'node:test';
import assert from 'node:assert/strict';
import type { Collection } from 'mongodb';
import { ContentService } from '../src/server/content';
import type { ContentRecord } from '../src/features/content/model';

test('portfolio pagination counts only ready content in the requested collection and category', async () => {
  const filters: unknown[] = [];
  const service = new ContentService({
    async countDocuments(filter: unknown) {
      filters.push(filter);
      return 24;
    },
  } as unknown as Collection<ContentRecord>);
  const requests: unknown[] = [];
  service.list = async (kind, admin, offset, limit, category) => {
    requests.push({ kind, admin, offset, limit, category });
    return Array.from({ length: limit! }, (_, index) => ({
      _id: String(offset! + index),
      kind,
      state: 'ready',
      createdAt: '2026-10-18',
      publicId: 'private',
    }));
  };
  for (const offset of [0, 12]) {
    const response = await service.handle(
      new Request(
        `http://localhost/api/content/gallery?limit=12&offset=${offset}&category=Wedding&pagination=1`,
      ),
      'gallery',
      undefined,
      false,
    );
    const body = await response.json();
    assert.equal(body.items.length, 12);
    assert.equal(body.total, 24);
    assert.equal(body.hasMore, offset === 0);
    assert.ok(body.items.every((item: ContentRecord) => !item.publicId));
  }
  assert.deepEqual(filters, [
    { kind: 'gallery', state: 'ready', category: 'Wedding' },
    { kind: 'gallery', state: 'ready', category: 'Wedding' },
  ]);
  assert.deepEqual(requests[1], {
    kind: 'gallery',
    admin: false,
    offset: 12,
    limit: 12,
    category: 'Wedding',
  });
  const films = await service.handle(
    new Request('http://localhost/api/content/videos?limit=6&pagination=1'),
    'videos',
    undefined,
    false,
  );
  assert.equal((await films.json()).items.length, 6);
  assert.deepEqual(filters[2], { kind: 'videos', state: 'ready' });
  const previousCalls = filters.length;
  const preview = await service.handle(
    new Request('http://localhost/api/content/gallery?limit=8'),
    'gallery',
    undefined,
    false,
  );
  assert.equal((await preview.json()).total, undefined);
  assert.equal(filters.length, previousCalls);
});
