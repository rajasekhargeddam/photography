import test from 'node:test';
import assert from 'node:assert/strict';
import type { Db } from 'mongodb';
import { alertText, sendTelegram } from '../src/server/telegram';
import { drainTelegram } from '../src/server/telegram-queue';

test('Telegram text omits local URLs and formats public admin links without customer contact data', () => {
  const alert = {
    kind: 'quote' as const,
    id: 'request-123',
    event: 'Wedding',
    date: '',
  };
  assert.ok(!alertText(alert, 'http://localhost:3000').includes('http'));
  assert.ok(
    alertText(alert, 'https://studio.example').includes(
      'https://studio.example/admin/requests/request-123',
    ),
  );
  assert.ok(alertText(alert, 'https://studio.example').includes('Not decided'));
});

test('Telegram transport respects retry-after and sanitizes failures containing credentials', async () => {
  const previous = {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
  };
  process.env.TELEGRAM_BOT_TOKEN = 'test-secret';
  process.env.TELEGRAM_CHAT_ID = '-123';
  try {
    await sendTelegram('Test', async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      assert.equal(body.chat_id, '-123');
      assert.equal(body.text, 'Test');
      assert.equal(body.parse_mode, undefined);
      return Response.json({ ok: true });
    });
    await assert.rejects(
      sendTelegram('Test', async () =>
        Response.json(
          { ok: false, parameters: { retry_after: 120 } },
          { status: 429 },
        ),
      ),
      { retryAfter: 120 },
    );
    await assert.rejects(
      sendTelegram('Test', async () => {
        throw new Error('test-secret');
      }),
      { message: 'Telegram delivery unavailable' },
    );
  } finally {
    if (previous.token === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previous.token;
    if (previous.chat === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = previous.chat;
  }
});

test('durable dispatcher ignores drafts and old records, deduplicates concurrent runs and retries failed delivery', async () => {
  const old = { ...process.env };
  process.env.TELEGRAM_BOT_TOKEN = 'test';
  process.env.TELEGRAM_CHAT_ID = '-123';
  process.env.TELEGRAM_ALERTS_SINCE = '2026-01-01T00:00:00.000Z';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongo-style test fixture supports heterogeneous operators.
  type Row = Record<string, any>; // Mongo-shaped in-memory fixture for queue state transitions.
  const tables: Record<string, Row[]> = {
    callbacks: [
      {
        _id: 'call',
        eventType: 'Birthday',
        eventDate: '2099-01-01',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
      { _id: 'old', createdAt: '2025-01-01T00:00:00.000Z' },
    ],
    enquiries: [{ _id: 'draft', status: 'ATTEMPTED' }],
    telegramNotifications: [],
  };
  const matches = (row: Row, filter: Row) =>
    Object.entries(filter).every(([key, value]) => {
      if (value && typeof value === 'object' && !(value instanceof Date))
        return Object.entries(value).every(([op, operand]) =>
          op === '$ne'
            ? row[key] !== operand
            : op === '$gte'
              ? row[key] >= (operand as number)
              : row[key] <= (operand as number),
        );
      return row[key] === value;
    });
  const db = {
    collection(name: string) {
      const rows = tables[name];
      const update = (filter: Row, change: Row, options?: Row) => {
        let row = rows.find((item) => matches(item, filter));
        if (!row && options?.upsert) {
          const inserted: Row = { ...filter, ...change.$setOnInsert };
          rows.push(inserted);
          row = inserted;
        }
        if (!row) return null;
        Object.assign(row, change.$set);
        for (const [key, amount] of Object.entries(change.$inc ?? {}))
          row[key] = (row[key] ?? 0) + Number(amount);
        for (const key of Object.keys(change.$unset ?? {})) delete row[key];
        return structuredClone(row);
      };
      return {
        updateOne: async (filter: Row, change: Row, options?: Row) =>
          update(filter, change, options),
        findOneAndUpdate: async (filter: Row, change: Row) =>
          update(filter, change),
        find: (filter: Row) => ({
          sort: () => ({
            limit: (n: number) => ({
              toArray: async () =>
                rows
                  .filter((r) => matches(r, filter))
                  .slice(0, n)
                  .map((r) => structuredClone(r)),
            }),
          }),
        }),
      };
    },
  } as unknown as Db;
  try {
    let attempts = 0;
    const deliver = async () => {
      attempts++;
      throw new Error('offline');
    };
    await Promise.all([drainTelegram(db, deliver), drainTelegram(db, deliver)]);
    assert.equal(attempts, 1);
    assert.equal(tables.telegramNotifications.filter((r) => r.alert).length, 1);
    assert.equal(
      tables.telegramNotifications.find((r) => r.alert)?.sent,
      false,
    );
    for (const row of tables.telegramNotifications)
      row.nextAttempt = new Date(0);
    await drainTelegram(db, async () => {
      attempts++;
    });
    assert.equal(attempts, 2);
    assert.equal(tables.telegramNotifications.find((r) => r.alert)?.sent, true);
    for (const row of tables.telegramNotifications)
      row.nextAttempt = new Date(0);
    await drainTelegram(db, async () => {
      attempts++;
    });
    assert.equal(attempts, 2);
    tables.enquiries.push({
      _id: 'quote',
      status: 'CONFIRMED',
      confirmedAt: new Date('2026-02-01'),
      details: { eventType: 'Wedding', eventDate: '2099-01-01' },
    });
    for (const row of tables.telegramNotifications)
      row.nextAttempt = new Date(0);
    await drainTelegram(db, async (text) => {
      attempts++;
      assert.ok(text.includes('New quote request'));
    });
    assert.equal(attempts, 3);
  } finally {
    for (const key of [
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_CHAT_ID',
      'TELEGRAM_ALERTS_SINCE',
    ]) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
  }
});
