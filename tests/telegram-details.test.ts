import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alertMessages,
  alertText,
  callbackAlert,
  quoteAlert,
} from '../src/server/telegram';
import type { Enquiry } from '../src/server/enquiries';
import { retryTelegram } from '../workers/telegram-retry';

test('callback alert includes saved contact and notes as plain text', () => {
  const text = alertText(
    callbackAlert({
      _id: 'callback',
      name: '<Customer>',
      mobile: '9876543210',
      notes: 'Please call\nafter 6 pm',
      eventType: 'Birthday',
      eventDate: '2099-01-01',
      createdAt: '2026-10-28T00:00:00Z',
    }),
    'https://studio.example',
  );
  for (const value of [
    '<Customer>',
    '9876543210',
    'Please call\nafter 6 pm',
    'Birthday',
    '1 Jan 2099',
  ])
    assert.ok(text.includes(value));
});

test('quote uses saved amounts and all ceremony, album and contact details without tokens', () => {
  const record = {
    _id: 'quote',
    tokenHash: 'SECRET-TOKEN',
    revision: 'PRIVATE-REVISION',
    confirmedAt: new Date('2026-10-28'),
    details: {
      eventType: 'Marriage',
      eventDate: '2099-01-01',
      name: 'Customer',
      mobile: '9876543210',
      location: 'Hyderabad',
      bookingType: 'CUSTOM',
      notes: 'Family portraits please',
      currency: 'INR',
      total: 24000,
      ceremonies: [
        {
          id: 'wedding',
          date: '2099-01-01',
          dateUndecided: false,
          location: 'Hall A',
          days: 2,
        },
        {
          id: 'reception',
          date: '',
          dateUndecided: true,
          location: 'Hall B',
          days: 1,
        },
      ],
      items: [
        {
          name: 'Candid photography',
          price: 12000,
          quantity: 2,
          groupName: 'Wedding ceremony',
          unit: 'day',
        },
      ],
      albumQuantity: 2,
      albumSize: '12x36',
      albumDelivery: 'one-month',
    },
  } as Enquiry;
  const text = alertText(quoteAlert(record), 'https://studio.example');
  for (const value of [
    'Customer',
    '9876543210',
    'Hall A',
    'Hall B',
    'Not decided',
    'Days: 2',
    'Candid photography',
    '24,000',
    'Albums: 2',
    '12x36',
    'One month',
    'Family portraits please',
  ])
    assert.ok(text.includes(value), value);
  assert.ok(!text.includes('SECRET-TOKEN'));
  assert.ok(!text.includes('PRIVATE-REVISION'));
});

test('multipart messages preserve every unicode character and remain inside Telegram limits', () => {
  const alert = {
    kind: 'quote' as const,
    id: 'test',
    event: 'Wedding',
    date: '',
    detailLines: ['🌸🧑🏽'.repeat(4000)],
  };
  const parts = alertMessages(alert, 'https://studio.example');
  assert.ok(parts.length > 1);
  assert.ok(parts.every((part) => part.length <= 4096));
  const recovered = parts
    .map((part) => part.slice(part.indexOf('\n') + 1))
    .join('');
  assert.equal(recovered, alertText(alert, 'https://studio.example'));
});

test('scheduled retry uses private service binding and reports failures', async () => {
  let calls = 0;
  const env = {
    TELEGRAM_RETRY_SECRET: 'test-secret',
    APP: {
      fetch: async (request: Request) => {
        calls++;
        assert.equal(request.method, 'POST');
        assert.equal(new URL(request.url).pathname, '/api/telegram/retry');
        assert.equal(
          request.headers.get('authorization'),
          'Bearer test-secret',
        );
        return Response.json({ ok: true });
      },
    },
  };
  await retryTelegram(env);
  assert.equal(calls, 1);
  await assert.rejects(retryTelegram({ ...env, TELEGRAM_RETRY_SECRET: '' }));
  assert.equal(calls, 1);
  await assert.rejects(
    retryTelegram({
      ...env,
      APP: { fetch: async () => new Response('', { status: 503 }) },
    }),
    /HTTP 503/,
  );
});
