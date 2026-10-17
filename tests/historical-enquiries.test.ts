import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  EnquiryService,
  hash,
  publicEnquiry,
  type Enquiry,
  type EnquiryRepository,
} from '../src/server/enquiries';
import { enquirySchema } from '../src/features/admin/data';

test('historical package snapshots remain readable, cannot be edited or newly confirmed, and confirmed retries work', async () => {
  const token = 'a'.repeat(64);
  const record: Enquiry = {
    _id: randomUUID(),
    tokenHash: hash(token),
    revision: randomUUID(),
    status: 'ATTEMPTED',
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedAt: null,
    details: {
      bookingType: 'PACKAGE',
      packageId: 'silver',
      serviceIds: [],
      eventType: 'Marriage',
      eventDate: '2099-10-10',
      name: 'Historical sample',
      mobile: '9000000000',
      location: '',
      currency: 'INR',
      total: 43210,
      items: [
        { id: 'silver', name: 'Saved package name', price: 43210, quantity: 1 },
      ],
    },
  };
  const before = structuredClone(record);
  const repository: EnquiryRepository = {
    find: async () => structuredClone(record),
    insert: async () => false,
    replace: async () => {
      throw new Error('Historical record must not be changed');
    },
    list: async () => [structuredClone(record)],
  };
  const service = new EnquiryService(repository);
  const response = JSON.parse(JSON.stringify(publicEnquiry(record)));
  assert.equal(enquirySchema.parse(response).details.total, 43210);
  await assert.rejects(
    service.confirm(record._id, token, record.revision),
    /historical package/,
  );
  await assert.rejects(
    service.save(record._id, token, {
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
    }),
    /historical package/,
  );
  assert.deepEqual(record, before);
  record.status = 'CONFIRMED';
  record.confirmedAt = new Date();
  assert.equal(
    (await service.confirm(record._id, token, record.revision)).details.total,
    43210,
  );
});
