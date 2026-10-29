import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Db } from 'mongodb';
import { drainTelegram } from '../src/server/telegram-queue';

test('original app leaves Telegram delivery to lite unless explicitly enabled', async () => {
  const previous = process.env.TELEGRAM_LOCAL_DISPATCH_ENABLED;
  delete process.env.TELEGRAM_LOCAL_DISPATCH_ENABLED;
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
    if (previous === undefined)
      delete process.env.TELEGRAM_LOCAL_DISPATCH_ENABLED;
    else process.env.TELEGRAM_LOCAL_DISPATCH_ENABLED = previous;
  }
});
