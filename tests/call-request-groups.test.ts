import test from 'node:test';
import assert from 'node:assert/strict';
import { groupByReceivedDay } from '../src/features/admin/data';

test('call requests share India date boundaries and deduplicate across pages', () => {
  const records = [
    { _id: 'yesterday', createdAt: '2026-10-17T18:29:59Z' },
    { _id: 'today', createdAt: '2026-10-17T18:30:00Z' },
    { _id: 'older', createdAt: '2026-10-16T12:00:00Z' },
    { _id: 'newest', createdAt: '2026-10-18T04:00:00Z' },
    { _id: 'today', createdAt: '2026-10-17T18:30:00Z' },
  ];
  const groups = groupByReceivedDay(
    records,
    (record) => record._id,
    new Date('2026-10-18T05:00:00Z'),
  );
  assert.deepEqual(
    groups.map((group) => group.key),
    ['2026-10-18', '2026-10-17', '2026-10-16'],
  );
  assert.deepEqual(
    groups.slice(0, 2).map((group) => group.label),
    ['Today', 'Yesterday'],
  );
  assert.deepEqual(
    groups[0].records.map((record) => record._id),
    ['newest', 'today'],
  );
  assert.equal(groups.flatMap((group) => group.records).length, 4);
  assert.deepEqual(
    groupByReceivedDay<{ createdAt: string }>([], (record) => record.createdAt),
    [],
  );
});
