import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLoginResponse } from '../src/features/admin/login-response';

test('sign-in handles a hosting HTML error without exposing a JSON parse error', async () => {
  await assert.rejects(
    checkLoginResponse(
      new Response('<!DOCTYPE html><h1>Worker error</h1>', { status: 500 }),
    ),
    /Sign-in is temporarily unavailable/,
  );
});

test('sign-in preserves server validation messages and requires confirmed success', async () => {
  await assert.rejects(
    checkLoginResponse(
      Response.json(
        { message: 'Email or password is incorrect.' },
        { status: 401 },
      ),
    ),
    /Email or password is incorrect/,
  );
  await assert.rejects(
    checkLoginResponse(Response.json({})),
    /temporarily unavailable/,
  );
  await checkLoginResponse(Response.json({ success: true }));
});
