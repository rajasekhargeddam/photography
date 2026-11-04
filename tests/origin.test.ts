import test from 'node:test';
import assert from 'node:assert/strict';
import { checkOrigin } from '../src/server/http';
import { commandOptions } from '../scripts/app-options';

test('Netlify builds preserve the public origin and reject missing or mismatched configuration', () => {
  const env = {
    NETLIFY: 'true',
    NEXT_PUBLIC_SITE_URL: 'https://studio.example',
    APP_ORIGIN: 'https://studio.example',
  };
  assert.equal(
    commandOptions(['build', 'management'], env).origin,
    env.APP_ORIGIN,
  );
  assert.equal(
    commandOptions(['dev', 'management'], env).origin,
    'http://localhost:3000',
  );
  assert.throws(() =>
    commandOptions(['build', 'management'], { NETLIFY: 'true' }),
  );
  assert.throws(() =>
    commandOptions(['build', 'management'], {
      ...env,
      APP_ORIGIN: 'http://localhost:3000',
    }),
  );
  assert.throws(() =>
    commandOptions(['build', 'management'], {
      ...env,
      APP_ORIGIN: 'https://studio.example/',
      NEXT_PUBLIC_SITE_URL: 'https://studio.example/',
    }),
  );
});

test('explicit domain aliases accept same-site submissions while rejecting foreign origins and missing origins', () => {
  const oldOrigin = process.env.APP_ORIGIN;
  const oldAliases = process.env.APP_ALLOWED_ORIGINS;
  process.env.APP_ORIGIN = 'https://studio.example';
  process.env.APP_ALLOWED_ORIGINS =
    'https://studio.netlify.app, https://www.studio.example, https://bad.example/path, http://insecure.example';
  const request = (origin?: string, site = 'same-origin') =>
    new Request('https://studio.netlify.app/api/enquiries', {
      method: 'POST',
      headers: { ...(origin ? { origin } : {}), 'sec-fetch-site': site },
    });
  try {
    for (const origin of [
      'https://studio.example',
      'https://studio.netlify.app',
      'https://www.studio.example',
    ])
      assert.doesNotThrow(() => checkOrigin(request(origin)));
    for (const origin of [
      undefined,
      'null',
      'https://evil.example',
      'https://studio.netlify.app.evil.example',
      'https://bad.example',
      'http://insecure.example',
    ])
      assert.throws(() => checkOrigin(request(origin)));
    assert.throws(() =>
      checkOrigin(request('https://studio.netlify.app', 'cross-site')),
    );
  } finally {
    if (oldOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = oldOrigin;
    if (oldAliases === undefined) delete process.env.APP_ALLOWED_ORIGINS;
    else process.env.APP_ALLOWED_ORIGINS = oldAliases;
  }
});
