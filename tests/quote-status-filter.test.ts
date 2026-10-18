import test from 'node:test';
import assert from 'node:assert/strict';
import type { Collection } from 'mongodb';
import type { Enquiry } from '../src/server/enquiries';
import { MongoEnquiries } from '../src/server/mongo-repository';

test('quote status filters apply before pagination and keep saved and sent records separate', async () => {
  const records = Array.from({ length: 8 }, (_, i) => ({
    _id: String(i),
    status: i % 2 ? 'CONFIRMED' : 'ATTEMPTED',
  }));
  const repository = new MongoEnquiries({
    find(filter: { status?: string }) {
      let matching = records.filter(
        (record) => !filter.status || record.status === filter.status,
      );
      return {
        sort() {
          return this;
        },
        skip(offset: number) {
          matching = matching.slice(offset);
          return this;
        },
        limit(limit: number) {
          matching = matching.slice(0, limit);
          return this;
        },
        async toArray() {
          return matching;
        },
      };
    },
  } as unknown as Collection<Enquiry>);
  assert.deepEqual(
    (await repository.list(2, 0, 'CONFIRMED')).map((record) => record._id),
    ['1', '3'],
  );
  assert.deepEqual(
    (await repository.list(2, 2, 'CONFIRMED')).map((record) => record._id),
    ['5', '7'],
  );
  assert.deepEqual(
    (await repository.list(2, 0, 'ATTEMPTED')).map((record) => record._id),
    ['0', '2'],
  );
  assert.deepEqual(
    (await repository.list(2, 0)).map((record) => record._id),
    ['0', '1'],
  );
});
