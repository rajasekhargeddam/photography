import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationTrigger } from '../src/server/notification-trigger';
test('admin reads and receipts never scan Telegram queue; successful submissions still trigger delivery', () => {
  const trigger = createNotificationTrigger();
  for (const path of [
    '/api/admin/enquiries',
    '/api/admin/callbacks',
    '/api/admin/enquiries/id/read',
  ]) {
    for (const method of ['GET', 'POST'])
      assert.equal(trigger(method, path, true), false);
  }
  assert.equal(trigger('POST', '/api/callbacks', true), true);
  assert.equal(trigger('POST', '/api/enquiries/id/confirm', true), true);
  assert.equal(trigger('POST', '/api/callbacks', false), false);
  assert.equal(trigger('PUT', '/api/enquiries/id', true), false);
});
