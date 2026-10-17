import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  groupEnquiries,
  enquirySchema,
  fetchEnquiries,
  fetchEnquiry,
  type Enquiry,
} from '../src/features/admin/data';

function record(createdAt: string): Enquiry {
  return {
    id: randomUUID(),
    revision: randomUUID(),
    status: 'ATTEMPTED',
    createdAt,
    updatedAt: createdAt,
    confirmedAt: null,
    details: {
      bookingType: 'PACKAGE',
      packageId: 'silver',
      serviceIds: [],
      eventType: 'Marriage',
      eventDate: '2099-10-10',
      name: 'Test Client',
      mobile: '9000000000',
      location: '',
      total: 45000,
      currency: 'INR',
      items: [
        { id: 'silver', name: 'Silver package', price: 45000, quantity: 1 },
      ],
    },
  };
}
test('date groups use India midnight, sort newest first and deduplicate page boundaries', () => {
  const today = record('2026-10-07T18:30:00.000Z');
  const yesterday = record('2026-10-07T18:29:59.000Z');
  const older = record('2026-10-05T10:00:00.000Z');
  const groups = groupEnquiries(
    [older, yesterday, today, today],
    new Date('2026-10-07T18:31:00Z'),
  );
  assert.deepEqual(
    groups.map((group) => group.key),
    ['2026-10-08', '2026-10-07', '2026-10-05'],
  );
  assert.deepEqual(
    groups.slice(0, 2).map((group) => group.label),
    ['Today', 'Yesterday'],
  );
  assert.equal(groups[0].enquiries.length, 1);
  assert.deepEqual(groupEnquiries([], new Date()), []);
});
test('Yesterday handles year boundaries independently of the computer timezone', () => {
  const groups = groupEnquiries(
    [record('2026-12-31T10:00:00.000Z')],
    new Date('2026-12-31T18:30:00Z'),
  );
  assert.equal(groups[0].label, 'Yesterday');
});
test('response validation rejects malformed private enquiry data', () => {
  const good = record('2026-10-08T10:00:00.000Z');
  assert.equal(enquirySchema.safeParse(good).success, true);
  assert.equal(
    enquirySchema.safeParse({ ...good, status: 'PAID' }).success,
    false,
  );
  assert.equal(
    enquirySchema.safeParse({
      ...good,
      details: { ...good.details, mobile: 'bad' },
    }).success,
    false,
  );
});
test('admin fetch handles unavailable, unauthorized, missing and malformed responses', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const signal = new AbortController().signal;
  for (const [status, message] of [
    [401, /sign in/],
    [404, /found/],
    [503, /unavailable/],
  ] as const) {
    globalThis.fetch = async () => new Response('{}', { status });
    await assert.rejects(fetchEnquiries(0, signal), message);
  }
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ enquiries: [] }));
  assert.deepEqual(await fetchEnquiries(0, signal), []);
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ enquiries: [{}] }));
  await assert.rejects(fetchEnquiries(0, signal), /could not be read/);
  await assert.rejects(fetchEnquiry('bad-id', signal), /invalid/);
});
