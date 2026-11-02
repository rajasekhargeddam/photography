import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareImage,
  WEBSITE_IMAGE_BYTES,
} from '../src/features/content/prepare-image';

test('small originals remain identical and invalid/paused files never decode', async () => {
  const file = new File(['original'], 'photo.jpg', { type: 'image/jpeg' });
  assert.equal(
    (await prepareImage(file, new AbortController().signal)).file,
    file,
  );
  await assert.rejects(
    prepareImage(
      new File([], 'empty.jpg', { type: 'image/jpeg' }),
      new AbortController().signal,
    ),
    /non-empty/,
  );
  await assert.rejects(
    prepareImage(
      new File(['bad'], 'bad.gif', { type: 'image/gif' }),
      new AbortController().signal,
    ),
    /JPEG/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(prepareImage(file, controller.signal), /paused/);
});

test('large photos prepare a bounded copy, retain alpha-capable formats, and release resources on failure/pause', async () => {
  const oldBitmap = Object.getOwnPropertyDescriptor(
    globalThis,
    'createImageBitmap',
  );
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let closed = 0,
    calls = 0,
    fail = false,
    controller = new AbortController();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: () => {},
      imageSmoothingEnabled: false,
      imageSmoothingQuality: '',
    }),
    toBlob(callback: (blob: Blob | null) => void, mime: string) {
      calls++;
      if (fail) return callback(null);
      if (calls === 1)
        return callback(
          new Blob([new Uint8Array(WEBSITE_IMAGE_BYTES + 1)], { type: mime }),
        );
      callback(new Blob(['encoded'], { type: mime }));
    },
  };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => canvas },
  });
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: async (_file: File, options: ImageBitmapOptions) => {
      assert.equal(options.imageOrientation, 'from-image');
      assert.equal(options.colorSpaceConversion, 'default');
      return {
        width: 8000,
        height: 4000,
        close: () => {
          closed++;
        },
      };
    },
  });
  try {
    const file = new File(
      [new Uint8Array(WEBSITE_IMAGE_BYTES + 10)],
      'portrait.png',
      { type: 'image/png', lastModified: 123 },
    );
    const copy = await prepareImage(file, controller.signal);
    assert.equal(copy.optimized, true);
    assert.equal(copy.file.type, 'image/webp');
    assert.equal(copy.file.name, 'portrait-web.webp');
    assert.equal(copy.file.lastModified, 123);
    assert.equal(copy.width, 6000);
    assert.equal(copy.height, 3000);
    assert.ok(copy.file.size < WEBSITE_IMAGE_BYTES);
    assert.equal(file.size, WEBSITE_IMAGE_BYTES + 10);
    assert.equal(closed, 1);
    assert.equal(canvas.width, 1);
    fail = true;
    await assert.rejects(
      prepareImage(file, controller.signal),
      /could not create/,
    );
    assert.equal(closed, 2);
    fail = false;
    controller = new AbortController();
    canvas.toBlob = (callback) => {
      controller.abort();
      callback(new Blob(['copy'], { type: 'image/webp' }));
    };
    await assert.rejects(prepareImage(file, controller.signal), /paused/);
    assert.equal(closed, 3);
  } finally {
    if (oldBitmap)
      Object.defineProperty(globalThis, 'createImageBitmap', oldBitmap);
    else Reflect.deleteProperty(globalThis, 'createImageBitmap');
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
