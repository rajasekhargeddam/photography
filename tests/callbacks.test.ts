import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Collection } from 'mongodb';
import {
  callbackInput,
  type CallbackRequest,
} from '../src/features/contact/model';
import { CallbackService } from '../src/server/callbacks';
import { createApi } from '../src/server/api';

const input = () => ({
  requestId: randomUUID(),
  name: 'Synthetic Client',
  mobile: '9000000000',
  eventType: 'Engagement',
  eventDate: '2099-10-10',
  notes: 'Please call in the evening.',
});
test('callback validates real future dates, phone, event choices and note limits', () => {
  assert.ok(callbackInput.safeParse(input()).success);
  assert.ok(
    callbackInput.safeParse({ ...input(), eventType: 'Others', notes: '' })
      .success,
  );
  for (const fields of [
    { eventDate: '2099-02-29' },
    { eventDate: '2000-01-01' },
    { mobile: '123' },
    { eventType: 'Post-Wedding' },
    { notes: 'x'.repeat(1001) },
    { name: ' ' },
    { requestId: 'bad-id' },
    { total: 100 },
  ])
    assert.ok(!callbackInput.safeParse({ ...input(), ...fields }).success);
});
test('callback retries persist a single immutable request without quote fields', async () => {
  const records = new Map<string, CallbackRequest>();
  const collection = {
    async updateOne(
      filter: { _id: string },
      update: { $setOnInsert: CallbackRequest },
    ) {
      if (!records.has(filter._id))
        records.set(filter._id, structuredClone(update.$setOnInsert));
    },
  } as unknown as Collection<CallbackRequest>;
  const service = new CallbackService(collection);
  const original = input();
  await Promise.all([service.save(original), service.save(original)]);
  assert.equal(records.size, 1);
  const saved = records.get(original.requestId)!;
  assert.equal(saved.eventType, 'Engagement');
  assert.equal(saved.notes, original.notes);
  assert.ok(!('services' in saved) && !('total' in saved));
  await service.save({ ...original, notes: 'Changed retry cannot overwrite' });
  assert.equal(records.get(original.requestId)!.notes, original.notes);
});
test('callback admin reads require authentication and public route rejects invalid input before connecting', async () => {
  const api = createApi(async () => {
    throw new Error('Must not connect');
  });
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
  const get = await api(new Request(`${origin}/api/admin/callbacks`));
  assert.equal(get.status, 401);
  const invalid = await api(
    new Request(`${origin}/api/callbacks`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input(), eventDate: 'bad' }),
    }),
  );
  assert.equal(invalid.status, 400);
  assert.equal((await api(new Request(`${origin}/api/callbacks`))).status, 405);
});
