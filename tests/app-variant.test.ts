import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVariant, isManagementPath } from '../src/config/app-variant';
import { createApi } from '../src/server/api';
import { telegramEnabled } from '../src/server/telegram-policy';
import { commandOptions, assertBuild } from '../scripts/app-options';

test('variant rejects typos and identifies management paths without blocking requests', () => {
  assert.equal(parseVariant(undefined), 'management');
  assert.equal(parseVariant('lite'), 'lite');
  assert.throws(() => parseVariant('Lite'));
  for (const path of [
    '/admin/content/gallery',
    '/admin/pricing',
    '/api/admin/content/hero/upload',
    '/api/admin/pricing/',
  ])
    assert.equal(isManagementPath(path), true);
  for (const path of [
    '/api/admin/enquiries',
    '/api/admin/callbacks',
    '/api/content/gallery',
    '/api/pricing',
  ])
    assert.equal(isManagementPath(path), false);
});

test('lite rejects every management method before database access; management preserves authentication', async () => {
  const previous = process.env.APP_VARIANT;
  let reads = 0;
  const api = createApi(async () => {
    reads++;
    throw new Error('Must not connect');
  });
  try {
    for (const mode of ['lite', 'management']) {
      process.env.APP_VARIANT = mode;
      for (const path of [
        '/api/admin/pricing',
        '/api/admin/content/gallery',
        '/api/admin/content/hero',
        '/api/admin/content/videos',
        '/api/admin/content/testimonials',
      ]) {
        for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
          const response = await api(
            new Request('http://localhost:3000' + path, {
              method,
              headers: { origin: 'http://localhost:3000' },
            }),
          );
          assert.equal(
            response.status,
            mode === 'lite' ? 404 : 401,
            `${mode} ${method} ${path}`,
          );
        }
      }
      assert.equal(
        (await api(new Request('http://localhost:3000/api/admin/enquiries')))
          .status,
        401,
      );
    }
    assert.equal(reads, 0);
  } finally {
    if (previous === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = previous;
  }
});

test('Telegram requires explicit enablement and a production management or lite runtime', () => {
  const environment: Record<string, string | undefined> = process.env;
  const oldMode = process.env.APP_VARIANT,
    oldFlag = process.env.TELEGRAM_DISPATCH_ENABLED,
    oldNodeEnv = environment['NODE_ENV'];
  try {
    for (const nodeEnv of ['development', 'test', 'production']) {
      environment['NODE_ENV'] = nodeEnv;
      for (const mode of ['management', 'lite'])
        for (const flag of ['false', 'true', '']) {
          process.env.APP_VARIANT = mode;
          process.env.TELEGRAM_DISPATCH_ENABLED = flag;
          assert.equal(
            telegramEnabled(),
            (mode === 'lite' || nodeEnv === 'production') && flag === 'true',
          );
        }
    }
  } finally {
    if (oldNodeEnv === undefined) delete environment['NODE_ENV'];
    else environment['NODE_ENV'] = oldNodeEnv;
    if (oldMode === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = oldMode;
    if (oldFlag === undefined) delete process.env.TELEGRAM_DISPATCH_ENABLED;
    else process.env.TELEGRAM_DISPATCH_ENABLED = oldFlag;
  }
});

test('commands fix local origins, restrict deploy targets and reject unsafe passthrough flags', () => {
  assert.equal(
    commandOptions(['dev', 'lite'], {}).origin,
    'http://localhost:3001',
  );
  assert.equal(
    commandOptions(['dev', 'management', '--port', '3100'], {}).origin,
    'http://localhost:3100',
  );
  assert.throws(() => commandOptions(['deploy', 'management'], {}));
  assert.throws(() => commandOptions(['deploy', 'lite'], {}));
  assert.throws(() => commandOptions(['upload', 'management'], {}));
  assert.throws(() => commandOptions(['build', 'lite'], {}));
  assert.throws(() => commandOptions(['upload', 'lite'], {}));
  assert.equal(
    commandOptions(['upload', 'lite'], { LITE_SITE_URL: 'https://company.in' })
      .origin,
    'https://company.in',
  );
  assert.throws(() => commandOptions(['build', 'lite', '--skipNextBuild'], {}));
  assert.throws(() => commandOptions(['dev', 'lite', '--port', '99999'], {}));
  for (const value of [
    'http://example.test',
    'https://example.test/path',
    'https://user:pass@example.test',
    'https://example.test/',
  ])
    assert.throws(() =>
      commandOptions(['build', 'lite'], { LITE_SITE_URL: value }),
    );
  assert.equal(
    commandOptions(['build', 'lite'], { LITE_SITE_URL: 'https://example.test' })
      .origin,
    'https://example.test',
  );
});

test('build verification rejects other modes, stale outputs and origin mismatches', () => {
  const stamp = {
    variant: 'lite' as const,
    buildId: 'A',
    cloudflare: true,
    origin: 'https://example.test',
  };
  assert.doesNotThrow(() =>
    assertBuild(stamp, 'lite', 'A', true, 'https://example.test'),
  );
  assert.throws(() => assertBuild(stamp, 'management', 'A'));
  assert.throws(() => assertBuild(stamp, 'lite', 'B'));
  assert.throws(() =>
    assertBuild(stamp, 'lite', 'A', true, 'https://other.test'),
  );
  assert.throws(() =>
    assertBuild({ ...stamp, cloudflare: false }, 'lite', 'A', true),
  );
});
