import test from 'node:test';
import assert from 'node:assert/strict';
import { runUploadQueue } from '../src/features/content/upload-queue';

test('batch uploads bound concurrency and retry failed photos without repeating saved photos', async () => {
  const entries = Array.from({ length: 6 }, (_, id) => ({ id, saved: false }));
  const calls: number[] = [];
  let active = 0;
  let maximum = 0;
  let fail = true;
  const upload = async (entry: (typeof entries)[number]) => {
    calls.push(entry.id);
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    entry.saved = !(fail && entry.id === 2);
    active--;
  };
  const signal = new AbortController().signal;
  await runUploadQueue(entries, (entry) => !entry.saved, upload, signal);
  assert.equal(maximum, 2);
  assert.equal(entries.filter((entry) => entry.saved).length, 5);
  fail = false;
  await runUploadQueue(entries, (entry) => !entry.saved, upload, signal);
  assert.deepEqual(calls, [0, 1, 2, 3, 4, 5, 2]);
  assert.ok(entries.every((entry) => entry.saved));
});

test('pausing a batch does not start queued photos, and resume skips successes', async () => {
  const entries = [0, 1, 2, 3];
  const controller = new AbortController();
  const saved = new Set<number>();
  await runUploadQueue(
    entries,
    (entry) => !saved.has(entry),
    async (entry) => {
      saved.add(entry);
      controller.abort();
    },
    controller.signal,
  );
  assert.deepEqual([...saved], [0]);
  const resumed: number[] = [];
  await runUploadQueue(
    entries,
    (entry) => !saved.has(entry),
    async (entry) => {
      resumed.push(entry);
    },
    new AbortController().signal,
  );
  assert.deepEqual(resumed, [1, 2, 3]);
});
