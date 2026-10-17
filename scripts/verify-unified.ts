// Opt-in integration check. Uses only a newly created, isolated synthetic database.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import { MongoAuth } from '../src/server/mongo-auth';
import { seedAdmin } from '../src/server/auth';
import { hash } from '../src/server/enquiries';

async function main() {
  if (process.argv.includes('--browser') && !process.stdin.isTTY)
    throw new Error('Browser QA requires an interactive terminal for cleanup.');
  if (!process.env.MONGODB_URI)
    throw new Error('Database configuration required.');
  const name = `qa_${randomUUID().replaceAll('-', '')}`;
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  try {
    await client.connect();
  } catch (error) {
    await client.close();
    throw error;
  }
  const db = client.db(name);
  console.log('Isolated QA database:', name);
  const repo = new MongoAuth(db);
  const origin = 'http://localhost:3100';
  const email = 'browser-qa@example.test';
  const password = 'Browser-QA-only-2099!';
  let server: ReturnType<typeof spawn> | undefined;
  try {
    await repo.initialize();
    assert.equal(await seedAdmin(repo, email, password), true);
    assert.equal(
      await seedAdmin(repo, email, 'Another-test-password-2099!'),
      false,
    );
    const require = createRequire(import.meta.url);
    server = spawn(
      process.execPath,
      [require.resolve('next/dist/bin/next'), 'start', '-p', '3100'],
      {
        env: {
          ...process.env,
          MONGODB_DATABASE: name,
          APP_ORIGIN: origin,
          NODE_ENV: 'production',
        },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let startupFailed = false;
    server.on('error', () => {
      startupFailed = true;
    });
    server.on('exit', () => {
      startupFailed = true;
    });
    // Consume output without printing configuration or customer data.
    server.stdout?.on('data', () => {});
    server.stderr?.on('data', () => {});
    let ready = false;
    for (let i = 0; i < 30; i++) {
      if (startupFailed) throw new Error('QA server did not start.');
      try {
        const response = await fetch(`${origin}/api/health`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* startup */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, 'QA server readiness');
    const call = (path: string, method = 'GET', body?: unknown, headers = {}) =>
      fetch(`${origin}${path}`, {
        method,
        redirect: 'manual',
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    assert.equal((await call('/admin/requests')).status, 307);
    assert.equal((await call('/api/admin/enquiries')).status, 401);
    const login = await call('/api/auth/login', 'POST', { email, password });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie')!, /Secure/);
    const Cookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.match(login.headers.get('set-cookie')!, /Max-Age=604800/);
    const callback = {
      requestId: randomUUID(),
      name: 'Synthetic Callback',
      mobile: '9000000001',
      eventType: 'Half Sari',
      eventDate: '2099-10-10',
      notes: 'Synthetic callback verification.',
    };
    for (let retry = 0; retry < 2; retry++)
      assert.equal(
        (await call('/api/callbacks', 'POST', callback)).status,
        200,
      );
    assert.equal(
      await db
        .collection('callbacks')
        .countDocuments({ _id: callback.requestId as never }),
      1,
    );
    assert.equal((await call('/api/admin/callbacks')).status, 401);
    const callbackList = await call('/api/admin/callbacks', 'GET', undefined, {
      Cookie,
    });
    assert.equal(callbackList.status, 200);
    const callbackRecord = (await callbackList.json()).items.find(
      (item: { _id: string }) => item._id === callback.requestId,
    );
    assert.equal(callbackRecord.notes, callback.notes);
    assert.equal(callbackRecord.eventDate, callback.eventDate);
    assert.equal(
      (
        await call('/api/callbacks', 'POST', callback, {
          Origin: 'https://foreign.example',
        })
      ).status,
      403,
    );
    for (let attempt = 0; attempt < 3; attempt++)
      assert.equal(
        (await call('/api/callbacks', 'POST', callback)).status,
        200,
      );
    assert.equal((await call('/api/callbacks', 'POST', callback)).status, 429);
    const weddingPhotos = await call(
      '/api/content/gallery?category=Wedding&limit=1',
    );
    assert.equal(weddingPhotos.status, 200);
    const filtered = (await weddingPhotos.json()).items;
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].category, 'Wedding');
    assert.equal(
      (await call('/api/content/gallery?category=Post-Wedding')).status,
      400,
    );
    assert.equal((await call('/api/content/gallery?limit=31')).status, 400);
    const reviewsRedirect = await call('/reviews');
    assert.equal(reviewsRedirect.status, 308);
    assert.equal(reviewsRedirect.headers.get('location'), '/testimonials');
    for (const path of ['/portfolio', '/testimonials', '/contact'])
      assert.equal((await call(path)).status, 200);
    const homeMarkup = await (await call('/')).text();
    assert.ok(
      homeMarkup.includes('BOOK YOUR DATE') &&
        homeMarkup.includes('BUILD YOUR QUOTE'),
    );
    assert.ok(
      !homeMarkup.includes('services-title') &&
        !homeMarkup.includes('steps-title'),
    );
    console.log(
      'Callback persistence/retry/rate limits, content filters and public routes passed.',
    );
    for (const kind of ['gallery', 'testimonials', 'videos']) {
      assert.equal((await call(`/api/admin/content/${kind}`)).status, 401);
      assert.equal((await call(`/admin/content/${kind}`)).status, 307);
      assert.equal(
        (await call(`/admin/content/${kind}`, 'GET', undefined, { Cookie }))
          .status,
        200,
      );
      const listed = await call(`/api/content/${kind}`);
      assert.equal(listed.status, 200);
      assert.ok((await listed.json()).items.length > 0);
    }
    for (const [kind, payload] of [
      [
        'testimonials',
        {
          name: 'Synthetic QA',
          date: '2026-10-14',
          text: 'Synthetic content verification only.',
        },
      ],
      [
        'videos',
        { title: 'Synthetic QA', url: 'https://youtu.be/csGs7DeGIpE' },
      ],
    ] as const) {
      const added = await call(`/api/admin/content/${kind}`, 'POST', payload, {
        Cookie,
      });
      assert.equal(added.status, 201);
      const item = await added.json();
      assert.ok(
        (await (await call(`/api/content/${kind}`)).json()).items.some(
          (entry: { _id: string }) => entry._id === item._id,
        ),
      );
      assert.equal(
        (
          await call(
            `/api/admin/content/${kind}/${item._id}`,
            'DELETE',
            undefined,
            { Cookie },
          )
        ).status,
        200,
      );
      assert.ok(
        !(await (await call(`/api/content/${kind}`)).json()).items.some(
          (entry: { _id: string }) => entry._id === item._id,
        ),
      );
    }
    assert.equal(
      (
        await call(
          '/api/admin/content/videos',
          'POST',
          { title: 'Invalid', url: 'https://example.com/video' },
          { Cookie },
        )
      ).status,
      400,
    );
    assert.equal(
      (await call('/api/content/videos', 'POST', { title: 'Invalid' })).status,
      405,
    );
    assert.equal(
      (
        await call(
          '/api/admin/content/videos',
          'POST',
          {},
          { Cookie, Origin: 'https://foreign.example' },
        )
      ).status,
      403,
    );
    // Real Cloudinary integration is opt-in. Never print its credentials or URLs.
    if (process.argv.includes('--cloudinary')) {
      const kind = process.argv.includes('--hero') ? 'hero' : 'gallery';
      const form = new FormData();
      form.set('category', 'Others');
      // Match the admin form: image descriptions are generated server-side.
      form.set(
        'file',
        new File(
          [await readFile('public/images/home/stitch-1.jpg')],
          'qa.jpg',
          { type: 'image/jpeg' },
        ),
      );
      let uploadedId: string | undefined;
      try {
        const upload = await fetch(`${origin}/api/admin/content/${kind}`, {
          method: 'POST',
          headers: { Origin: origin, Cookie },
          body: form,
        });
        assert.equal(upload.status, 201, 'Cloudinary upload');
        const photo = await upload.json();
        uploadedId = photo._id;
        assert.equal(photo.width, 512);
        assert.equal(photo.height, 279);
        assert.equal(photo.state, 'ready');
        const publicPhotos = (await (await call(`/api/content/${kind}`)).json())
          .items;
        assert.ok(
          publicPhotos.some((item: { _id: string }) => item._id === uploadedId),
        );
        assert.ok(
          publicPhotos.every((item: { publicId?: string }) => !item.publicId),
        );
      } finally {
        // Include pending entries if the upload failed after reaching Cloudinary.
        const pending = await db
          .collection('content')
          .find({ sample: { $ne: true }, kind })
          .toArray();
        const { destroyImage } = await import('../src/server/cloudinary');
        for (const item of pending)
          if (item.publicId) await destroyImage(item.publicId);
        if (uploadedId)
          assert.equal(
            (
              await call(
                `/api/admin/content/${kind}/${uploadedId}`,
                'DELETE',
                undefined,
                { Cookie },
              )
            ).status,
            200,
          );
      }
      console.log(
        'Cloudinary signed upload, metadata, public read and deletion passed.',
      );
    }
    console.log(
      'Content access, pages, create/read/delete and validation passed.',
    );
    assert.equal(
      (await call('/admin/requests', 'GET', undefined, { Cookie })).status,
      200,
    );
    const id = randomUUID();
    const Authorization = `Bearer ${'d'.repeat(64)}`;
    const draft = {
      quoteVersion: 2,
      eventType: 'Marriage',
      ceremonies: [
        {
          id: 'wedding',
          date: '2099-10-10',
          dateUndecided: false,
          location: '',
          days: 1,
          serviceIds: ['candid'],
        },
      ],
      albumQuantity: 0,
      name: 'Synthetic Client',
      mobile: '9000000000',
      notes: '',
    };
    const savedResponse = await call(`/api/enquiries/${id}`, 'PUT', draft, {
      Authorization,
    });
    assert.equal(savedResponse.status, 200);
    const saved = await savedResponse.json();
    assert.equal(saved.status, 'ATTEMPTED');
    const retry = await (
      await call(`/api/enquiries/${id}`, 'PUT', draft, { Authorization })
    ).json();
    assert.equal(retry.revision, saved.revision);
    const changed = await (
      await call(
        `/api/enquiries/${id}`,
        'PUT',
        {
          ...draft,
          ceremonies: [
            { ...draft.ceremonies[0], serviceIds: ['drone'] },
            {
              id: 'pre-wedding',
              date: '',
              dateUndecided: true,
              location: 'Synthetic outdoor location',
              days: 2,
              serviceIds: ['cinematic'],
            },
          ],
          albumQuantity: 2,
        },
        { Authorization },
      )
    ).json();
    assert.equal(changed.details.total, 78000);
    for (let i = 0; i < 2; i++) {
      const result = await call(
        `/api/enquiries/${id}/confirm`,
        'POST',
        { revision: changed.revision },
        { Authorization },
      );
      assert.equal((await result.json()).status, 'CONFIRMED');
    }
    const detail = await (
      await call(`/api/admin/enquiries/${id}`, 'GET', undefined, { Cookie })
    ).json();
    assert.equal(detail.details.total, 78000);
    assert.equal(detail.tokenHash, undefined);
    assert.deepEqual(detail.details, changed.details);
    assert.equal(detail.details.ceremonies.length, 2);
    assert.equal(
      detail.details.ceremonies.find(
        (c: { id: string }) => c.id === 'pre-wedding',
      ).dateUndecided,
      true,
    );
    assert.equal(await db.collection('enquiries').countDocuments(), 1);
    // Keep a historical package snapshot to verify its display after migration.
    const oldId = randomUUID();
    const now = new Date();
    await db.collection('enquiries').insertOne({
      _id: oldId as never,
      tokenHash: hash('d'.repeat(64)),
      revision: randomUUID(),
      status: 'ATTEMPTED',
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      details: {
        eventType: 'Marriage',
        eventDate: '2099-10-10',
        location: 'Test location',
        mobile: '9000000000',
        name: 'Synthetic Package History',
        bookingType: 'PACKAGE',
        packageId: 'silver',
        serviceIds: [],
        currency: 'INR',
        total: 45000,
        items: [
          { id: 'silver', name: 'Silver package', price: 45000, quantity: 1 },
        ],
      },
    });
    const historical = await (
      await call('/api/admin/enquiries/' + oldId, 'GET', undefined, { Cookie })
    ).json();
    assert.equal(historical.details.total, 45000);
    assert.equal(
      (
        await call(
          '/api/enquiries/' + randomUUID(),
          'PUT',
          {
            ...draft,
            bookingType: 'PACKAGE',
            packageId: 'silver',
            serviceIds: [],
          },
          { Authorization },
        )
      ).status,
      400,
    );
    const retired = await call('/packages');
    assert.equal(retired.status, 308);
    assert.equal(retired.headers.get('location'), '/book');
    assert.equal(
      (await call('/api/auth/logout', 'POST', undefined, { Cookie })).status,
      200,
    );
    assert.equal(
      (await call('/api/admin/enquiries', 'GET', undefined, { Cookie })).status,
      401,
    );
    console.log(
      'PASS: real Next.js + MongoDB, seeded login, protected page/API, save/edit/retry/confirm, admin snapshots and logout.',
    );
    if (process.argv.includes('--browser')) {
      console.log(
        'Isolated browser QA ready at http://localhost:3100/admin/login. Press Enter after browser checks to clean up.',
      );
      process.stdin.resume();
      await new Promise<void>((resolve) =>
        process.stdin.once('data', () => {
          process.stdin.pause();
          resolve();
        }),
      );
    }
  } finally {
    if (server && server.exitCode === null) {
      server.kill();
      await new Promise<void>((resolve) => {
        server!.once('exit', () => resolve());
        setTimeout(resolve, 3000).unref();
      });
    }
    assert.match(name, /^qa_[a-f0-9]{32}$/);
    try {
      await db.dropDatabase();
    } finally {
      await client.close();
    }
    console.log(
      'Removed the isolated QA database. Existing studio records were not modified.',
    );
  }
}
main().catch((error) => {
  console.error(
    'Unified integration verification failed:',
    error?.name,
    error?.code,
    error?.cause?.code,
    error?.name === 'AssertionError' ? error.message : '(credentials omitted)',
  );
  process.exitCode = 1;
});
