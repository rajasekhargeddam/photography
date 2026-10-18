import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import type { Collection } from 'mongodb';
import { getImageProps } from 'next/image';
import { ContentService } from '../src/server/content';
import {
  imageUploadGrant,
  managedPublicId,
  verifiedUploadedImage,
} from '../src/server/cloudinary';
import { createApi } from '../src/server/api';
import type { ContentRecord } from '../src/features/content/model';
import {
  photographyImageLoader,
  portfolioImageSizes,
} from '../src/lib/image-delivery';
import {
  uploadOriginal,
  type OriginalUpload,
} from '../src/features/content/image-upload';

function memoryRecords() {
  const records = new Map<string, ContentRecord>();
  const collection = {
    async insertOne(record: ContentRecord) {
      records.set(record._id, { ...record });
    },
    async findOne(filter: { _id: string; kind: string }) {
      const record = records.get(filter._id);
      return record?.kind === filter.kind ? { ...record } : null;
    },
    async updateOne(
      filter: { _id: string; state?: string },
      update: {
        $set?: Partial<ContentRecord>;
        $unset?: Record<string, unknown>;
      },
    ) {
      const record = records.get(filter._id);
      if (!record || (filter.state && record.state !== filter.state))
        return { modifiedCount: 0 };
      Object.assign(record, update.$set);
      for (const key of Object.keys(update.$unset ?? {}))
        delete (record as unknown as Record<string, unknown>)[key];
      return { modifiedCount: 1 };
    },
  } as unknown as Collection<ContentRecord>;
  return { records, service: new ContentService(collection) };
}
const metadataRequest = () =>
  new Request('http://localhost/api/admin/content/gallery/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Wedding',
      alt: 'Original wedding portrait',
    }),
  });

test('direct upload grants reserve ownership and sign only safe original-upload fields', async () => {
  const old = process.env.CLOUDINARY_URL;
  process.env.CLOUDINARY_URL = 'cloudinary://key:secret@test-cloud';
  try {
    const { service, records } = memoryRecords();
    const grant = await service.beginImageUpload('gallery', metadataRequest());
    assert.equal(records.get(grant.id)?.state, 'pending');
    assert.equal(grant.fields.public_id, managedPublicId(grant.id));
    assert.equal(grant.fields.overwrite, 'false');
    assert.equal(grant.fields.allowed_formats, 'jpg,png,webp');
    assert.equal(grant.fields.api_key, 'key');
    assert.equal('transformation' in grant.fields, false);
    assert.equal(JSON.stringify(grant).includes('secret'), false);
    const { api_key: _key, signature, ...signed } = grant.fields;
    void _key;
    const canonical = Object.entries(signed)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => k + '=' + v)
      .join('&');
    assert.equal(
      signature,
      createHash('sha256')
        .update(canonical + 'secret')
        .digest('hex'),
    );
    await assert.rejects(service.remove('gallery', grant.id), { status: 409 });
    assert.throws(() => imageUploadGrant('foreign-asset'), { status: 400 });
  } finally {
    if (old === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = old;
  }
});

test('direct upload endpoints retain authentication and origin checks', async () => {
  const api = createApi(async () => {
    throw new Error('Must not connect');
  });
  for (const id of ['upload', randomUUID()]) {
    const url = 'http://localhost:3000/api/admin/content/gallery/' + id;
    assert.equal(
      (
        await api(
          new Request(url, {
            method: 'POST',
            headers: {
              Origin: process.env.APP_ORIGIN ?? 'http://localhost:3000',
            },
          }),
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await api(
          new Request(url, {
            method: 'POST',
            headers: { Origin: 'https://foreign.test' },
          }),
        )
      ).status,
      403,
    );
  }
});

test('finalization uses provider metadata, preserves large originals, is idempotent, and never publishes incomplete assets', async () => {
  const old = process.env.CLOUDINARY_URL;
  const oldFetch = globalThis.fetch;
  process.env.CLOUDINARY_URL = 'cloudinary://key:secret@test-cloud';
  try {
    const { service, records } = memoryRecords();
    const grant = await service.beginImageUpload('gallery', metadataRequest());
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      calls++;
      assert.ok(
        String(url).endsWith(encodeURIComponent(managedPublicId(grant.id))),
      );
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        'Basic ' + Buffer.from('key:secret').toString('base64'),
      );
      return Response.json({
        public_id: managedPublicId(grant.id),
        resource_type: 'image',
        type: 'upload',
        format: 'jpg',
        bytes: 25 * 1024 * 1024,
        width: 7000,
        height: 5000,
        secure_url:
          'https://res.cloudinary.com/test-cloud/image/upload/v123/' +
          managedPublicId(grant.id) +
          '.jpg',
      });
    };
    const response = await service.handle(
      new Request('http://localhost/api/admin/content/gallery/' + grant.id, {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://foreign.test/fake.jpg',
          width: 1,
        }),
      }),
      'gallery',
      grant.id,
      true,
    );
    const completed = await response.json();
    assert.equal(completed.width, 7000);
    assert.equal(completed.bytes, 25 * 1024 * 1024);
    assert.ok(completed.url.includes('/v123/'));
    assert.equal(completed.uploadExpiresAt, undefined);
    assert.equal(records.get(grant.id)?.state, 'ready');
    await service.completeImageUpload('gallery', grant.id);
    assert.equal(calls, 1);
    const missing = await service.beginImageUpload(
      'gallery',
      metadataRequest(),
    );
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await assert.rejects(service.completeImageUpload('gallery', missing.id), {
      status: 409,
    });
    assert.equal(records.get(missing.id)?.state, 'pending');
    globalThis.fetch = async () =>
      Response.json({ public_id: 'foreign-id', resource_type: 'image' });
    await assert.rejects(verifiedUploadedImage(managedPublicId(missing.id)), {
      status: 502,
    });
    await assert.rejects(service.completeImageUpload('hero', missing.id), {
      status: 404,
    });
  } finally {
    globalThis.fetch = oldFetch;
    if (old === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = old;
  }
});

test('portfolio delivery offers sharp responsive sources and keeps originals and full-photo aspect ratios intact', () => {
  const src =
    'https://res.cloudinary.com/test-cloud/image/upload/v123/my-dream-photography/' +
    randomUUID() +
    '.jpg';
  const { props } = getImageProps({
    src,
    width: 7000,
    height: 5000,
    alt: 'Portrait',
    loader: photographyImageLoader,
    sizes: portfolioImageSizes('editorial', 0),
  });
  assert.ok(props.srcSet?.includes('w_3840'));
  assert.ok(props.srcSet?.includes('q_auto:best'));
  assert.ok(props.sizes?.includes('60vw'));
  assert.equal(props.loading, 'lazy');
  assert.ok(!props.src.includes('c_fill'));
  assert.ok(src.includes('/image/upload/v123/'));
  assert.equal(
    photographyImageLoader({ src: '/images/demo.jpg', width: 800 }),
    '/images/demo.jpg',
  );
  assert.ok(portfolioImageSizes('grid', 0).includes('30vw'));
  assert.ok(photographyImageLoader({ src, width: 3200 }).includes('w_3200'));
});

test('browser uploads preserve file bytes above 4 MB and split larger originals into resumable chunks', async () => {
  const original = globalThis.XMLHttpRequest;
  const sent: Array<{ headers: Record<string, string>; blob: Blob }> = [];
  class FakeXHR {
    headers: Record<string, string> = {};
    upload: {
      onprogress?: (event: {
        loaded: number;
        total: number;
        lengthComputable: boolean;
      }) => void;
    } = {};
    status = 200;
    responseText = '{}';
    timeout = 0;
    onload?: () => void;
    onerror?: () => void;
    onabort?: () => void;
    ontimeout?: () => void;
    open(_method: string, url: string) {
      assert.equal(
        url,
        'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
      );
    }
    setRequestHeader(key: string, value: string) {
      this.headers[key] = value;
    }
    abort() {
      this.onabort?.();
    }
    send(data: FormData) {
      const blob = data.get('file') as Blob;
      sent.push({ headers: this.headers, blob });
      queueMicrotask(() => {
        this.upload.onprogress?.({
          loaded: blob.size,
          total: blob.size,
          lengthComputable: true,
        });
        this.onload?.();
      });
    }
  }
  globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
  const session = (size: number): OriginalUpload => ({
    grant: {
      id: randomUUID(),
      url: 'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
      fields: { signature: 'signed' },
    },
    file: new File([new Uint8Array(size)], 'original.jpg', {
      type: 'image/jpeg',
    }),
    category: 'Wedding',
    nextByte: 0,
    uploadId: randomUUID(),
    uploaded: false,
  });
  try {
    const small = session(6 * 1024 * 1024);
    await uploadOriginal(small, new AbortController().signal, () => {});
    assert.equal(sent[0].blob.size, small.file.size);
    assert.equal(sent[0].headers['Content-Range'], undefined);
    const large = session(25 * 1024 * 1024);
    await uploadOriginal(large, new AbortController().signal, () => {});
    assert.equal(sent.length, 3);
    assert.equal(
      sent[1].headers['Content-Range'],
      `bytes 0-${20 * 1024 * 1024 - 1}/${large.file.size}`,
    );
    assert.equal(
      sent[2].headers['Content-Range'],
      `bytes ${20 * 1024 * 1024}-${large.file.size - 1}/${large.file.size}`,
    );
    assert.equal(
      sent[1].headers['X-Unique-Upload-Id'],
      sent[2].headers['X-Unique-Upload-Id'],
    );
    assert.equal(sent[1].blob.size + sent[2].blob.size, large.file.size);
    assert.equal(large.uploaded, true);
    await uploadOriginal(large, new AbortController().signal, () => {});
    assert.equal(sent.length, 3);
  } finally {
    if (original === undefined)
      Reflect.deleteProperty(globalThis, 'XMLHttpRequest');
    else globalThis.XMLHttpRequest = original;
  }
});
