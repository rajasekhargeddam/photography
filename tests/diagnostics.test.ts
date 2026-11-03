import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guarded } from '../src/server/http';
import { ApiFailure } from '../src/server/enquiries';

test('unexpected failures have a safe correlated diagnostic without exposing secrets', async (t) => {
  const logs: string[] = [];
  t.mock.method(console, 'error', (line: string) => logs.push(line));
  const secret =
    'mongodb://private-user:private-password@private-host/customer';
  const response = await guarded(async () => {
    throw Object.assign(new Error(secret), {
      name: 'MongoServerError',
      code: 18,
    });
  });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.requestId, response.headers.get('X-Request-ID'));
  assert.equal(JSON.parse(logs[0]).requestId, body.requestId);
  assert.equal(JSON.parse(logs[0]).category, 'database-authentication');
  assert.ok(!JSON.stringify([logs, body]).includes(secret));
  assert.equal(logs.length, 1);
});

test('expected validation failures keep their status and do not generate error logs', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const response = await guarded(async () => {
    throw new ApiFailure(400, 'Invalid input.');
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: 'Invalid input.' });
  assert.equal(log.mock.callCount(), 0);
});
