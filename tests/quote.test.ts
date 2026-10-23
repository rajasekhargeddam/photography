import { questionsFor } from '../src/features/booking/questions';
import {
  weddingCeremonies,
  isCoupleShoot,
} from '../src/features/booking/quote';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  bookingReducer as reduce,
  bookingActions as a,
  initialBooking,
} from '../src/features/booking/model';
import {
  coverageFor,
  newCeremony,
  quoteTotal,
  quoteItems,
  validateQuote,
  dateError,
  indiaToday,
  type QuoteDraft,
} from '../src/features/booking/quote';
import { eventTypes } from '../src/features/booking/events';
import {
  snapshot,
  EnquiryService,
  hash,
  type Enquiry,
  type EnquiryRepository,
} from '../src/server/enquiries';
import { enquirySchema, eventDate } from '../src/features/admin/data';

const wedding: QuoteDraft = {
  quoteVersion: 2,
  eventType: 'Marriage',
  ceremonies: [
    {
      ...newCeremony('wedding'),
      dateUndecided: true,
      serviceIds: ['candid', 'audience-video'],
    },
    {
      ...newCeremony('pre-wedding'),
      date: '2099-10-10',
      dateUndecided: false,
      days: 2,
      serviceIds: ['cinematic', 'drone'],
    },
  ],
  albumQuantity: 2,
  albumSize: '12x36',
  albumDelivery: 'discuss',
  name: 'Synthetic Client',
  mobile: '9000000000',
  notes: 'Discuss delivery',
};
test('all event branches validate and simple shoots skip ceremony selection', () => {
  for (const event of eventTypes) {
    const id = event === 'Marriage' ? 'wedding' : 'shoot';
    const draft = {
      ...wedding,
      eventType: event,
      ceremonies: [
        {
          ...newCeremony(id),
          dateUndecided: true,
          serviceIds: [coverageFor(event, id)[0].id],
        },
      ],
    };
    assert.deepEqual(validateQuote(draft), {});
    assert.equal(
      snapshot(draft).total,
      coverageFor(event, id)[0].price + 20000,
    );
  }
});
test('server totals use per-ceremony, per-day and album quantities with saved groups', () => {
  const result = snapshot(wedding);
  assert.equal(result.total, 113000); // 15k + 12k + (25k + 8k)*2 + 10k*2
  assert.equal(quoteTotal(wedding), 113000);
  assert.equal(
    result.items.find((i) => i.id === 'pre-wedding:cinematic')?.quantity,
    2,
  );
  assert.equal(
    result.items.find((i) => i.id === 'wedding:audience-video')?.groupName,
    'Wedding ceremony',
  );
  assert.equal(result.pricingStatus, 'DEVELOPMENT_SAMPLE');
  assert.equal(result.eventDate, '2099-10-10');
});
test('removing ceremonies clears dependent charges and changing events resets selections', () => {
  let state = { ...initialBooking, ...wedding };
  state = reduce(state, a.toggleCeremony('wedding'));
  assert.equal(quoteTotal(state), 86000);
  assert.ok(quoteItems(state).every((i) => i.groupId !== 'wedding'));
  state = reduce(state, a.chooseEvent('Baby Shoot'));
  assert.equal(quoteTotal(state), 0);
  assert.equal(state.name, wedding.name);
  assert.deepEqual(state.ceremonies, [newCeremony('shoot')]);
  state = reduce(
    state,
    a.toggleService({ ceremonyId: 'shoot', serviceId: 'led-wall' }),
  );
  assert.deepEqual(state.ceremonies[0].serviceIds, []);
});
test('dates allow explicit undecided, reject ambiguity and impossible/past dates, preserve India boundary', () => {
  assert.equal(dateError('', true), '');
  for (const [date, undecided] of [
    ['', false],
    ['2099-02-30', false],
    ['2020-01-01', false],
    ['2099-01-01', true],
  ] as const)
    assert.ok(dateError(date, undecided));
  assert.equal(dateError('2026-10-13', false, '2026-10-13'), '');
  assert.equal(indiaToday(new Date('2026-10-12T18:30:00Z')), '2026-10-13');
  const state = reduce(
    { ...initialBooking, ...wedding },
    a.updateCeremony({ id: 'pre-wedding', changes: { dateUndecided: true } }),
  );
  assert.equal(state.ceremonies[1].date, '');
  assert.equal(eventDate(''), 'Date not decided');
});
test('tampered service, quantities, duplicate ceremonies and nested client prices fail', () => {
  const first = wedding.ceremonies[0];
  for (const input of [
    { ...wedding, total: 1 },
    { ...wedding, albumQuantity: 1.5 },
    { ...wedding, albumQuantity: 6 },
    { ...wedding, albumQuantity: -1 },
    { ...wedding, ceremonies: [] },
    { ...wedding, ceremonies: [first, first] },
    { ...wedding, ceremonies: [{ ...first, id: 'invented' }] },
    { ...wedding, ceremonies: [{ ...first, days: 2 }] },
    { ...wedding, ceremonies: [{ ...first, serviceIds: ['album'] }] },
    {
      ...wedding,
      ceremonies: [{ ...first, serviceIds: ['candid', 'candid'] }],
    },
    { ...wedding, ceremonies: [{ ...first, price: 1 }] },
    {
      ...wedding,
      eventType: 'Baby Shoot',
      ceremonies: [{ ...first, id: 'shoot', serviceIds: ['candid', 'drone'] }],
    },
    { ...wedding, notes: 'x'.repeat(1001) },
    { ...wedding, name: ' ' },
    { ...wedding, mobile: '123' },
  ])
    assert.throws(() => snapshot(input));
});
test('canonical selection order makes retry snapshots identical', () => {
  assert.deepEqual(
    snapshot(wedding),
    snapshot({
      ...wedding,
      ceremonies: [...wedding.ceremonies]
        .reverse()
        .map((c) => ({ ...c, serviceIds: [...c.serviceIds].reverse() })),
    }),
  );
});
test('v2 snapshots and historical custom requests confirm without repricing', async () => {
  const token = 'a'.repeat(64);
  let record: Enquiry = {
    _id: randomUUID(),
    tokenHash: hash(token),
    revision: randomUUID(),
    status: 'ATTEMPTED',
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedAt: null,
    details: { ...snapshot(wedding), total: 12345 },
  };
  const repository: EnquiryRepository = {
    find: async () => structuredClone(record),
    insert: async () => false,
    list: async () => [record],
    replace: async (value) => {
      record = value;
      return true;
    },
  };
  const service = new EnquiryService(repository);
  assert.equal(
    (await service.confirm(record._id, token, record.revision)).details.total,
    12345,
  );
  const json = JSON.parse(JSON.stringify({ ...record, id: record._id }));
  const parsed = enquirySchema.parse(json);
  assert.equal(parsed.details.ceremonies?.length, 2);
  assert.equal(parsed.details.notes, 'Discuss delivery');
  assert.equal(
    parsed.details.items.find((i) => i.groupId === 'extras')?.quantity,
    2,
  );
  record = {
    ...record,
    status: 'ATTEMPTED',
    details: {
      bookingType: 'CUSTOM',
      packageId: '',
      eventType: 'Marriage',
      eventDate: '2099-10-10',
      location: '',
      name: 'Old custom',
      mobile: '9000000000',
      serviceIds: ['drone'],
      currency: 'INR',
      items: [
        { id: 'drone', name: 'Old drone rate', price: 7777, quantity: 1 },
      ],
      total: 7777,
    },
  };
  assert.equal(
    (await service.confirm(record._id, token, record.revision)).details.total,
    7777,
  );
});

test('guided wedding questions insert and remove conditional branches', () => {
  let state = reduce(initialBooking, a.chooseEvent('Marriage'));
  assert.deepEqual(
    questionsFor(state)
      .slice(0, 3)
      .map((q) => q.id),
    ['event', 'coverage:wedding', 'include:engagement'],
  );
  for (const ceremony of weddingCeremonies.slice(1)) {
    state = reduce(state, a.toggleCeremony(ceremony.id));
    const sequence = questionsFor(state).map((q) => q.id);
    assert.ok(sequence.includes(`coverage:${ceremony.id}`));
    if (isCoupleShoot('Marriage', ceremony.id))
      assert.ok(sequence.includes(`duration:${ceremony.id}`));
    state = reduce(state, a.toggleCeremony(ceremony.id));
    assert.ok(
      !questionsFor(state).some((q) => q.id === `coverage:${ceremony.id}`),
    );
  }
  state = reduce(state, a.setAlbumQuantity(1));
  assert.ok(questionsFor(state).some((q) => q.id === 'album-delivery'));
  state = reduce(state, a.setAlbumQuantity(0));
  assert.ok(!questionsFor(state).some((q) => q.id === 'album-size'));
  assert.equal(questionsFor(state).at(-2)?.kind, 'album');
  for (const event of eventTypes) {
    const flow = questionsFor({ ...state, eventType: event });
    assert.ok(flow.every((q) => !['date', 'dates'].includes(q.kind)));
  }
  assert.equal(questionsFor(state).at(-1)?.kind, 'contact');
});
test('guided album preferences and service quantities persist with server prices', () => {
  const input = {
    ...wedding,
    albumSize: '14x40',
    albumDelivery: 'one-month',
    ceremonies: [
      { ...wedding.ceremonies[1], quantities: { cinematic: 2, drone: 1 } },
    ],
  };
  const saved = snapshot(input);
  assert.equal(saved.total, 144000); // 25k*2 units*2 days + 8k*2 days + 14k*2 albums
  assert.equal(saved.albumDelivery, 'one-month');
  assert.equal(saved.items[0].quantity, 4);
  assert.deepEqual(
    saved,
    snapshot({
      ...input,
      ceremonies: [
        { ...input.ceremonies[0], quantities: { drone: 1, cinematic: 2 } },
      ],
    }),
  );
  assert.deepEqual(
    saved,
    snapshot({
      ...input,
      ceremonies: [{ ...input.ceremonies[0], quantities: { cinematic: 2 } }],
    }),
  );
  for (const quantities of [
    { cinematic: 0 },
    { cinematic: 6 },
    { cinematic: 1.5 },
    { candid: 2 },
  ])
    assert.throws(() =>
      snapshot({
        ...input,
        ceremonies: [{ ...input.ceremonies[0], quantities }],
      }),
    );
  assert.throws(() => snapshot({ ...input, albumSize: 'invented' }));
});

test('confirmation preserves the saved PDF snapshot without guest credentials', () => {
  const state = {
    ...initialBooking,
    ...wedding,
    session: { id: randomUUID(), token: 'private-token' },
    saved: {
      id: randomUUID(),
      revision: randomUUID(),
      status: 'ATTEMPTED' as const,
      requestKey: 'saved',
      items: quoteItems(wedding),
      total: 108000,
    },
  };
  const confirmed = reduce(state, a.enquiryConfirmed(state.saved.id));
  assert.equal(confirmed.session, null);
  assert.equal(confirmed.saved, null);
  assert.equal(confirmed.completedQuote?.saved.status, 'CONFIRMED');
  assert.equal(confirmed.completedQuote?.saved.total, 108000);
  assert.deepEqual(confirmed.completedQuote?.saved.items, state.saved.items);
  assert.equal(
    JSON.stringify(confirmed.completedQuote).includes('private-token'),
    false,
  );
  assert.equal(reduce(confirmed, a.resetBooking()).completedQuote, null);
});
