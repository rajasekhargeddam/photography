import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  categories,
  testimonialInput,
  videoInput,
  youtubeId,
  MAX_IMAGE_BYTES,
} from '../src/features/content/model';
import {
  validateImage,
  uploadImage,
  destroyImage,
  managedPublicId,
} from '../src/server/cloudinary';
import { sampleContent } from '../src/server/content';
import { createApi } from '../src/server/api';

test('content validates categories, calendar dates and YouTube URLs without accepting foreign hosts', () => {
  assert.ok(categories.includes('Engagement'));
  assert.ok(!categories.some((value) => (value as string) === 'Post-Wedding'));
  const review = { name: 'Client', text: 'Our review', date: '2024-02-29' };
  assert.ok(testimonialInput.safeParse(review).success);
  assert.ok(
    !testimonialInput.safeParse({ ...review, date: '2025-02-29' }).success,
  );
  assert.ok(!testimonialInput.safeParse({ ...review, name: ' ' }).success);
  for (const url of [
    'https://youtu.be/csGs7DeGIpE?t=1',
    'https://www.youtube.com/watch?v=csGs7DeGIpE',
    'https://youtube.com/shorts/csGs7DeGIpE',
    'https://www.youtube-nocookie.com/embed/csGs7DeGIpE',
  ])
    assert.equal(youtubeId(url), 'csGs7DeGIpE');
  for (const url of [
    'https://youtube.com.evil.test/watch?v=csGs7DeGIpE',
    'https://evil.test/csGs7DeGIpE',
    'javascript:alert(1)',
    'https://youtube.com/watch?v=x',
    'https://user@youtube.com/watch?v=csGs7DeGIpE',
  ])
    assert.equal(youtubeId(url), null);
  assert.ok(
    !videoInput.safeParse({ title: '', url: 'https://youtu.be/csGs7DeGIpE' })
      .success,
  );
  const samples = sampleContent();
  assert.equal(new Set(samples.map((item) => item._id)).size, samples.length);
  assert.ok(samples.every((item) => item.sample));
  assert.ok(
    samples
      .filter((item) => item.kind === 'testimonials')
      .every((item) => !item.date),
  );
});

test('content endpoints reject unauthenticated admin access before database connection', async () => {
  const api = createApi(async () => {
    throw new Error('Must not connect');
  });
  for (const method of ['GET', 'POST', 'DELETE']) {
    const response = await api(
      new Request('http://localhost:3000/api/admin/content/gallery', {
        method,
        headers: { Origin: process.env.APP_ORIGIN ?? 'http://localhost:3000' },
      }),
    );
    assert.equal(response.status, 401);
  }
});

test('images reject mismatched type, oversized files and unmanaged deletion; signed upload uses trusted metadata', async () => {
  await assert.rejects(
    validateImage(new File(['<svg/>'], 'test.jpg', { type: 'image/jpeg' })),
    { status: 400 },
  );
  await assert.rejects(
    validateImage(
      new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'test.jpg', {
        type: 'image/jpeg',
      }),
    ),
    { status: 400 },
  );
  await assert.rejects(destroyImage('someone-elses-image'), { status: 400 });
  const previous = process.env.CLOUDINARY_URL;
  const originalFetch = globalThis.fetch;
  process.env.CLOUDINARY_URL = 'cloudinary://test-key:test-secret@test-cloud';
  const publicId = managedPublicId(randomUUID());
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    const form = init?.body as FormData;
    assert.equal(form.get('public_id'), publicId);
    assert.match(String(form.get('signature')), /^[a-f0-9]{64}$/);
    assert.equal(form.get('api_secret'), null);
    return Response.json(
      String(url).endsWith('/destroy')
        ? { result: 'ok' }
        : {
            public_id: publicId,
            resource_type: 'image',
            format: 'jpg',
            width: 512,
            height: 286,
            secure_url: `https://res.cloudinary.com/test-cloud/image/upload/${publicId}.jpg`,
          },
    );
  };
  try {
    const image = await uploadImage(
      new File([new Uint8Array([255, 216, 255, 0])], 'image.jpg', {
        type: 'image/jpeg',
      }),
      publicId,
    );
    assert.equal(image.width, 512);
    await destroyImage(publicId);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = previous;
  }
});
import { readFile } from 'node:fs/promises';
import type { Collection } from 'mongodb';
import type { ContentRecord } from '../src/features/content/model';
import { ContentService } from '../src/server/content';

test('hero rejects a sixth image before upload when all five slots are reserved', async () => {
  const previous = process.env.CLOUDINARY_URL;
  process.env.CLOUDINARY_URL = 'cloudinary://test-key:test-secret@test-cloud';
  const slots: number[] = [];
  const service = new ContentService({
    async insertOne(record: ContentRecord) {
      slots.push(record.heroSlot!);
      throw Object.assign(new Error('Occupied slot'), { code: 11000 });
    },
  } as unknown as Collection<ContentRecord>);
  try {
    const form = new FormData();
    // Admin uploads no longer require a description field.
    form.set(
      'file',
      new File(
        [await readFile('public/images/home/stitch-1.jpg')],
        'hero.jpg',
        { type: 'image/jpeg' },
      ),
    );
    await assert.rejects(
      service.create(
        'hero',
        new Request('http://localhost/api/admin/content/hero', {
          method: 'POST',
          body: form,
        }),
      ),
      { status: 409 },
    );
    assert.deepEqual(slots, [1, 2, 3, 4, 5]);
  } finally {
    if (previous === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = previous;
  }
});

test('hero endpoints require an admin session before accessing storage', async () => {
  const api = createApi(async () => {
    throw new Error('Must not connect');
  });
  for (const method of ['GET', 'POST', 'DELETE']) {
    const result = await api(
      new Request('http://localhost:3000/api/admin/content/hero', {
        method,
        headers: { Origin: process.env.APP_ORIGIN ?? 'http://localhost:3000' },
      }),
    );
    assert.equal(result.status, 401);
  }
});

test('admin portfolio counts cover all categories independently of filtered pagination', async () => {
  const service = new ContentService({
    aggregate() {
      return {
        toArray: async () => [
          { _id: { category: 'Wedding', state: 'ready' }, count: 42 },
          { _id: { category: 'Wedding', state: 'deleted' }, count: 3 },
          { _id: { category: 'Birthday', state: 'pending' }, count: 1 },
        ],
      };
    },
  } as unknown as Collection<ContentRecord>);
  service.list = async () => [];
  const response = await service.handle(
    new Request(
      'http://localhost/api/admin/content/gallery?category=Birthday&limit=1',
    ),
    'gallery',
    undefined,
    true,
  );
  const body = await response.json();
  assert.deepEqual(
    body.categoryCounts.find(
      (row: { category: string }) => row.category === 'Wedding',
    ),
    { category: 'Wedding', current: 42, pending: 0, removed: 3 },
  );
  assert.equal(
    body.categoryCounts.find(
      (row: { category: string }) => row.category === 'Birthday',
    ).pending,
    1,
  );
  const publicResponse = await service.handle(
    new Request('http://localhost/api/content/gallery'),
    'gallery',
    undefined,
    false,
  );
  assert.equal((await publicResponse.json()).categoryCounts, undefined);
});
