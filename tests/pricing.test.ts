import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Collection } from 'mongodb';
import { PricingService, type PricingRecord } from '../src/server/pricing';
import { defaultPrices, pricesSchema } from '../src/features/pricing/model';
import {
  snapshot,
  EnquiryService,
  type Enquiry,
  type EnquiryRepository,
} from '../src/server/enquiries';
import { coverageFor, quoteTotal } from '../src/features/booking/quote';

function priceStore() {
  let record: PricingRecord | null = null;
  const collection = {
    async findOne() {
      return record ? structuredClone(record) : null;
    },
    async updateOne(
      filter: { revision: string },
      update: { $set: Omit<PricingRecord, '_id'> },
      options: { upsert: boolean },
    ) {
      if (record && record.revision !== filter.revision) {
        if (options.upsert) throw { code: 11000 };
        return { matchedCount: 0, upsertedCount: 0 };
      }
      const existed = !!record;
      record = { _id: 'services', ...structuredClone(update.$set) };
      return { matchedCount: existed ? 1 : 0, upsertedCount: existed ? 0 : 1 };
    },
  } as unknown as Collection<PricingRecord>;
  return new PricingService(collection);
}

test('prices persist, validate every field and reject stale edits', async () => {
  const service = priceStore();
  const initial = await service.get();
  assert.deepEqual(initial.prices, defaultPrices);
  const prices = { ...defaultPrices, candid: 21000, drone: 0 };
  const saved = await service.update({ ...initial, prices }, 'admin-1');
  assert.deepEqual(await service.get(), saved);
  assert.notEqual(saved.revision, initial.revision);
  await assert.rejects(service.update(initial, 'admin-2'), { status: 409 });
  for (const value of [-1, 1.5, 1000001, '12000', null]) {
    assert.equal(
      pricesSchema.safeParse({ ...prices, candid: value }).success,
      false,
    );
  }
  assert.equal(
    pricesSchema.safeParse({ ...prices, unknown: 12 }).success,
    false,
  );
  const { candid: ignored, ...missing } = prices;
  void ignored;
  await assert.rejects(
    service.update({ prices: missing, revision: saved.revision }, 'admin-1'),
    { status: 400 },
  );
  assert.deepEqual(await service.get(), saved);
});

const draft = {
  quoteVersion: 2 as const,
  eventType: 'Pre-Wedding',
  ceremonies: [
    {
      id: 'shoot',
      date: '',
      dateUndecided: true,
      location: '',
      days: 2,
      serviceIds: ['candid', 'drone'],
      quantities: { candid: 2 },
    },
  ],
  albumQuantity: 2,
  albumSize: '14x40' as const,
  albumDelivery: 'discuss' as const,
  name: 'Synthetic Client',
  mobile: '9000000000',
  notes: '',
};
test('current prices flow through displayed rates, quantities, albums and saved server totals', () => {
  const prices = {
    ...defaultPrices,
    candid: 21000,
    drone: 0,
    'album-large': 16000,
  };
  assert.equal(
    coverageFor('Pre-Wedding', 'shoot', prices).find((s) => s.id === 'candid')
      ?.price,
    21000,
  );
  const saved = snapshot(draft, prices, 'revision-2');
  assert.equal(saved.total, 116000);
  assert.equal(quoteTotal(draft, prices), saved.total);
  assert.equal(saved.catalogueVersion, 'revision-2');
  assert.throws(() => snapshot({ ...draft, prices: { candid: 1 } }, prices));
});
test('new quotes use changed prices; confirming saved quotes never reprices them', async () => {
  const pricing = priceStore();
  const records = new Map<string, Enquiry>();
  const repository: EnquiryRepository = {
    find: async (id) => records.get(id) ?? null,
    insert: async (value) => {
      if (records.has(value._id)) return false;
      records.set(value._id, value);
      return true;
    },
    replace: async (value) => {
      records.set(value._id, value);
      return true;
    },
    list: async () => [...records.values()],
  };
  const service = new EnquiryService(repository, () => pricing.get());
  const token = 'a'.repeat(64);
  const first = await service.save(randomUUID(), token, draft);
  const current = await pricing.get();
  await pricing.update(
    { ...current, prices: { ...current.prices, candid: 23000 } },
    'admin-1',
  );
  const second = await service.save(randomUUID(), token, draft);
  assert.equal(second.details.total - first.details.total, 32000);
  const retry = await service.save(first._id, token, draft);
  assert.equal(retry.revision, first.revision);
  assert.equal(retry.details.total, first.details.total);
  const confirmed = await service.confirm(first._id, token, first.revision);
  assert.equal(confirmed.details.total, first.details.total);
});
