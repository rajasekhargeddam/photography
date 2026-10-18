import test from 'node:test';
import assert from 'node:assert/strict';
import type { Collection } from 'mongodb';
import { ContentService } from '../src/server/content';
import { createApi } from '../src/server/api';
import type { ContentRecord } from '../src/features/content/model';

const request = (body: unknown) =>
  new Request('http://localhost/api/admin/content/gallery/photo-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
    body: JSON.stringify(body),
  });
function setup(alt = 'Wedding photography') {
  const photo: ContentRecord = {
    _id: 'photo-1',
    kind: 'gallery',
    state: 'ready',
    category: 'Wedding',
    alt,
    createdAt: '2026-10-18',
    url: 'https://example.test/original.jpg',
    width: 5000,
    height: 3000,
    publicId: 'owned-photo',
  };
  const updates: unknown[] = [];
  const service = new ContentService({
    async findOne(filter: Partial<ContentRecord>) {
      return filter._id === photo._id &&
        filter.kind === photo.kind &&
        filter.state === photo.state
        ? { ...photo }
        : null;
    },
    async updateOne(
      filter: Partial<ContentRecord>,
      update: { $set: Partial<ContentRecord> },
    ) {
      updates.push(update);
      if (filter.state !== photo.state || filter.category !== photo.category)
        return { matchedCount: 0 };
      Object.assign(photo, update.$set);
      return { matchedCount: 1 };
    },
  } as unknown as Collection<ContentRecord>);
  return { service, photo, updates };
}
test('editing an existing photo category preserves original image metadata and updates generated descriptions', async () => {
  const { service, photo, updates } = setup();
  const before = { ...photo };
  const response = await service.handle(
    request({ category: 'Birthday', previousCategory: 'Wedding' }),
    'gallery',
    'photo-1',
    true,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(photo, {
    ...before,
    category: 'Birthday',
    alt: 'Birthday photography',
  });
  assert.deepEqual(updates, [
    { $set: { category: 'Birthday', alt: 'Birthday photography' } },
  ]);
  const custom = setup('A quiet moment with family');
  await custom.service.changePhotoCategory(
    'photo-1',
    request({ category: 'Others', previousCategory: 'Wedding' }),
  );
  assert.equal(custom.photo.alt, 'A quiet moment with family');
});
test('category edits reject invalid payloads, missing/deleted/pending photos and stale edits', async () => {
  const { service, photo, updates } = setup();
  for (const body of [
    { category: 'Unknown', previousCategory: 'Wedding' },
    { category: 'Birthday' },
    {
      category: 'Birthday',
      previousCategory: 'Wedding',
      url: 'https://evil.test',
    },
  ])
    await assert.rejects(
      service.changePhotoCategory('photo-1', request(body)),
      { status: 400 },
    );
  await assert.rejects(
    service.changePhotoCategory(
      'photo-1',
      request({ category: 'Birthday', previousCategory: 'Others' }),
    ),
    { status: 409 },
  );
  for (const state of ['pending', 'deleted'] as const) {
    photo.state = state;
    await assert.rejects(
      service.changePhotoCategory(
        'photo-1',
        request({ category: 'Birthday', previousCategory: 'Wedding' }),
      ),
      { status: 404 },
    );
  }
  assert.equal(updates.length, 0);
  await assert.rejects(
    service.handle(
      request({ category: 'Birthday', previousCategory: 'Wedding' }),
      'gallery',
      'photo-1',
      false,
    ),
    { status: 405 },
  );
  await assert.rejects(
    service.handle(
      request({ category: 'Birthday', previousCategory: 'Wedding' }),
      'hero',
      'photo-1',
      true,
    ),
    { status: 405 },
  );
});
test('category changes keep authentication and same-origin protection before database access', async () => {
  const api = createApi(async () => {
    throw new Error('Must not connect');
  });
  const origin = process.env.APP_ORIGIN ?? 'http://localhost';
  const url = origin + '/api/admin/content/gallery/photo-1';
  assert.equal(
    (
      await api(
        new Request(url, { method: 'PATCH', headers: { Origin: origin } }),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await api(
        new Request(url, {
          method: 'PATCH',
          headers: { Origin: 'https://foreign.test' },
        }),
      )
    ).status,
    403,
  );
});
