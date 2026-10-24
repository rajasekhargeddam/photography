import test from 'node:test';
import assert from 'node:assert/strict';
import type { Collection } from 'mongodb';
import { QuoteReads, type QuoteRead } from '../src/server/quote-reads';
import type { Enquiry } from '../src/server/enquiries';
import { createApi } from '../src/server/api';

test('quote receipts are shared across admin sessions and become unread after changes or submission', async () => {
  const records = new Map<string, QuoteRead>();
  const collection = {
    find: (filter: { _id: { $in: string[] } }) => ({
      toArray: async () =>
        [...records.values()].filter((r) => filter._id.$in.includes(r._id)),
    }),
    updateOne: async (
      filter: { _id: string },
      update: { $set: Omit<QuoteRead, '_id'> },
    ) => {
      records.set(filter._id, { ...filter, ...update.$set });
    },
  } as unknown as Collection<QuoteRead>;
  const reads = new QuoteReads(collection);
  const quote = {
    _id: 'quote',
    revision: 'v1',
    status: 'ATTEMPTED',
  } as Enquiry;
  assert.deepEqual(await reads.unread([quote]), [true]);
  await reads.mark(quote);
  await reads.mark(quote);
  assert.equal(records.size, 1);
  assert.deepEqual(await reads.unread([quote]), [false]);
  const otherSession = new QuoteReads(collection);
  assert.deepEqual(await otherSession.unread([quote]), [false]);
  assert.deepEqual(await reads.unread([{ ...quote, revision: 'v2' }]), [true]);
  assert.deepEqual(await reads.unread([{ ...quote, status: 'CONFIRMED' }]), [
    true,
  ]);
});

test('read receipts reject unauthenticated callers before database access', async () => {
  const api = createApi(async () => {
    throw new Error('Must not connect');
  });
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
  const response = await api(
    new Request(
      `${origin}/api/admin/enquiries/00000000-0000-4000-8000-000000000000/read`,
      {
        method: 'POST',
        headers: { origin, 'Content-Type': 'application/json' },
        body: '{}',
      },
    ),
  );
  assert.equal(response.status, 401);
});
