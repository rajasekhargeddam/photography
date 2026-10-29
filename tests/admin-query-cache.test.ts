import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdminClient,
  saveReadReceipt,
} from '../src/features/admin/query-cache';
import type { Enquiry } from '../src/features/admin/data';

test('reopening a quote deduplicates receipts, updates badges locally, and a changed revision sends again', async () => {
  const client = createAdminClient();
  const record = {
    id: 'request',
    revision: 'first',
    status: 'CONFIRMED',
    unread: true,
  } as Enquiry;
  client.setQueryData(['enquiries', 'CONFIRMED', ''], {
    pages: [[record]],
    pageParams: [0],
  });
  let requests = 0;
  const send: typeof fetch = async () => {
    requests++;
    return Response.json({ success: true });
  };
  try {
    await Promise.all([
      saveReadReceipt(client, record, send),
      saveReadReceipt(client, record, send),
    ]);
    await saveReadReceipt(client, record, send);
    assert.equal(requests, 1);
    const list = client.getQueryData<{ pages: Enquiry[][] }>([
      'enquiries',
      'CONFIRMED',
      '',
    ]);
    assert.equal(list?.pages[0][0].unread, false);
    await saveReadReceipt(client, { ...record, revision: 'second' }, send);
    assert.equal(requests, 2);
  } finally {
    client.clear();
  }
});
test('private cache reuses fresh reads; failed receipt remains retryable; clearing removes private data', async () => {
  const client = createAdminClient();
  const record = {
    id: 'request',
    revision: 'first',
    status: 'CONFIRMED',
  } as Enquiry;
  let reads = 0;
  const options = {
    queryKey: ['enquiry', 'request'],
    queryFn: async () => {
      reads++;
      return record;
    },
  };
  try {
    await client.fetchQuery(options);
    await client.fetchQuery(options);
    assert.equal(reads, 1);
    await assert.rejects(
      saveReadReceipt(
        client,
        record,
        async () => new Response('', { status: 503 }),
      ),
    );
    await saveReadReceipt(client, record, async () =>
      Response.json({ success: true }),
    );
    assert.equal(client.getDefaultOptions().queries?.refetchOnReconnect, false);
    client.clear();
    assert.equal(client.getQueryData(options.queryKey), undefined);
  } finally {
    client.clear();
  }
});
