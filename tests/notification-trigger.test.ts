import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationTrigger } from '../src/server/notification-trigger';

test('admin bursts share one notification check per minute without delaying customer submissions', () => {
  let now = 1000;
  const trigger = createNotificationTrigger(() => now);
  assert.equal(trigger('GET', '/api/admin/enquiries', true), true);
  for (let i = 0; i < 100; i++)
    assert.equal(trigger('POST', '/api/admin/content/gallery', true), false);
  assert.equal(trigger('POST', '/api/callbacks', true), true);
  assert.equal(trigger('POST', '/api/enquiries/quote-id/confirm', true), true);
  now += 59_999;
  assert.equal(trigger('GET', '/api/admin/enquiries', true), false);
  now++;
  assert.equal(trigger('GET', '/api/admin/enquiries', true), true);
});

test('failed requests and public reads never trigger reconciliation or consume the admin window', () => {
  const trigger = createNotificationTrigger(() => 1000);
  assert.equal(trigger('GET', '/api/admin/enquiries', false), false);
  assert.equal(trigger('POST', '/api/callbacks', false), false);
  assert.equal(trigger('GET', '/api/content/gallery', true), false);
  assert.equal(trigger('PUT', '/api/enquiries/quote-id', true), false);
  assert.equal(trigger('GET', '/api/admin/enquiries', true), true);
});
