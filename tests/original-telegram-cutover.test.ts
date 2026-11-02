import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Db } from 'mongodb';
import { drainTelegram } from '../src/server/telegram-queue';

test('management mode never accesses the real Telegram queue', async () => {
  const previous = process.env.APP_VARIANT;
  process.env.APP_VARIANT = 'management';
  let accessed = false;
  const db = {
    collection() {
      accessed = true;
      throw new Error('Original app must not dispatch');
    },
  } as unknown as Db;
  try {
    await drainTelegram(db);
    assert.equal(accessed, false);
  } finally {
    if (previous === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = previous;
  }
});
