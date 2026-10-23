import type { PricingService } from '../src/server/pricing';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  AuthService,
  SESSION_SECONDS,
  SESSION_COOKIE,
  seedAdmin,
  type Admin,
  type AdminSession,
  type AuthRepository,
} from '../src/server/auth';
import {
  EnquiryService,
  type Enquiry,
  type EnquiryRepository,
} from '../src/server/enquiries';
import { createApi } from '../src/server/api';

class MemoryAuth implements AuthRepository {
  admins = new Map<string, Admin>();
  sessions = new Map<string, AdminSession>();
  counters = new Map<string, number>();
  async byEmail(email: string) {
    return [...this.admins.values()].find((a) => a.email === email) ?? null;
  }
  async byId(id: string) {
    return this.admins.get(id) ?? null;
  }
  async insertAdmin(admin: Admin) {
    if (await this.byEmail(admin.email)) return false;
    this.admins.set(admin._id, admin);
    return true;
  }
  async session(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async saveSession(session: AdminSession) {
    this.sessions.set(session._id, session);
  }
  async deleteSession(id: string) {
    this.sessions.delete(id);
  }
  async consume(key: string, limit: number) {
    const count = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, count);
    return count <= limit;
  }
}
class MemoryEnquiries implements EnquiryRepository {
  records = new Map<string, Enquiry>();
  fail = false;
  async find(id: string) {
    return structuredClone(this.records.get(id) ?? null);
  }
  async insert(record: Enquiry) {
    if (this.fail) throw new Error('unavailable');
    if (this.records.has(record._id)) return false;
    this.records.set(record._id, structuredClone(record));
    return true;
  }
  async replace(record: Enquiry, revision: string) {
    const old = this.records.get(record._id);
    if (old?.revision !== revision || old.status !== 'ATTEMPTED') return false;
    this.records.set(record._id, structuredClone(record));
    return true;
  }
  async list(limit: number, offset: number) {
    return [...this.records.values()].slice(offset, offset + limit);
  }
}
const input = {
  quoteVersion: 2,
  eventType: 'Marriage',
  ceremonies: [
    {
      id: 'wedding',
      date: '2099-10-10',
      dateUndecided: false,
      location: '',
      days: 1,
      serviceIds: ['candid'],
    },
  ],
  albumQuantity: 0,
  name: 'Synthetic Client',
  mobile: '9000000000',
  notes: '',
};
const password = 'Synthetic-only-password-27!';
function fixture(pricing?: Pick<PricingService, 'get' | 'update'>) {
  const authRepository = new MemoryAuth();
  const repository = new MemoryEnquiries();
  const services = {
    pricing,
    authRepository,
    repository,
    auth: new AuthService(authRepository),
    service: new EnquiryService(repository),
  };
  const api = createApi(async () => services);
  const call = (
    path: string,
    method = 'GET',
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    api(
      new Request(`http://localhost:3000/api/${path}`, {
        method,
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  return { ...services, call, api };
}

test('seed is idempotent; passwords are hashed; sessions expire and revoke without relying on TTL cleanup', async () => {
  assert.equal(SESSION_SECONDS, 604800);
  const { auth, authRepository: repo } = fixture();
  assert.equal(await seedAdmin(repo, 'Owner@Example.test', password), true);
  const admin = (await repo.byEmail('owner@example.test'))!;
  assert.notEqual(admin.passwordHash, password);
  assert.equal(
    await seedAdmin(repo, 'owner@example.test', 'A-different-password-27!'),
    false,
  );
  assert.equal(repo.admins.size, 1);
  const token = await auth.login({ email: admin.email, password });
  assert.equal((await auth.current(token))?.id, admin._id);
  assert.equal(repo.sessions.has(token), false);
  admin.active = false;
  assert.equal(await auth.current(token), null);
  admin.active = true;
  admin.version = randomUUID();
  assert.equal(await auth.current(token), null);
  const next = await auth.login({ email: admin.email, password });
  const session = [...repo.sessions.values()].at(-1)!;
  session.expiresAt = new Date(0);
  assert.equal(await auth.current(next), null);
  await auth.logout(next);
  assert.equal(repo.sessions.size, 1);
});

test('unknown, disabled and wrong-password accounts fail generically; login throttles', async () => {
  const { auth, authRepository: repo } = fixture();
  await seedAdmin(repo, 'owner@example.test', password);
  for (const email of ['owner@example.test', 'unknown@example.test']) {
    await assert.rejects(auth.login({ email, password: 'wrong-password' }), {
      status: 401,
      message: 'Email or password is incorrect.',
    });
  }
  (await repo.byEmail('owner@example.test'))!.active = false;
  await assert.rejects(auth.login({ email: 'owner@example.test', password }), {
    status: 401,
  });
  for (let i = 0; i < 3; i++)
    await assert.rejects(
      auth.login({ email: 'owner@example.test', password }),
      { status: 401 },
    );
  await assert.rejects(auth.login({ email: 'owner@example.test', password }), {
    status: 429,
  });
});

test('same-origin API protects admin data, cookies, logout and rejects CSRF / oversized input', async () => {
  const { call, api, authRepository: repo } = fixture();
  assert.equal((await call('admin/enquiries')).status, 401);
  assert.equal(
    (
      await call('admin/enquiries', 'GET', undefined, {
        Authorization: 'Bearer legacy-key',
      })
    ).status,
    401,
  );
  assert.equal(
    (await call('auth/login', 'POST', {}, { Origin: 'https://other.test' }))
      .status,
    403,
  );
  assert.equal(
    (
      await api(
        new Request('http://localhost:3000/api/auth/logout', {
          method: 'POST',
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (await call('auth/login', 'POST', { password: 'x'.repeat(17000) })).status,
    413,
  );
  assert.equal((await call('auth/register', 'POST', {})).status, 404);
  await seedAdmin(repo, 'owner@example.test', password);
  const login = await call('auth/login', 'POST', {
    email: 'owner@example.test',
    password,
  });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get('set-cookie')!;
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.match(setCookie, /Max-Age=604800/);
  const Cookie = setCookie.split(';')[0];
  const list = await call('admin/enquiries', 'GET', undefined, { Cookie });
  assert.equal(list.status, 200);
  assert.match(list.headers.get('cache-control')!, /no-store/);
  assert.equal(
    (await call('admin/enquiries?limit=oops', 'GET', undefined, { Cookie }))
      .status,
    400,
  );
  assert.equal(
    (await call('auth/logout', 'POST', undefined, { Cookie })).status,
    200,
  );
  assert.equal(
    (await call('admin/enquiries', 'GET', undefined, { Cookie })).status,
    401,
  );
});

test('migration preserves ownership, pricing, retry, edits, revision checks and historical package details', async () => {
  const { call, repository, authRepository } = fixture();
  const id = randomUUID();
  const Authorization = `Bearer ${'a'.repeat(64)}`;
  const put = (body: unknown, bearer = Authorization) =>
    call(`enquiries/${id}`, 'PUT', body, { Authorization: bearer });
  for (const invalid of [
    { ...input, total: 1 },
    { ...input, mobile: '123' },
    { ...input, eventDate: '2099-02-30' },
    { ...input, packageId: 'fake' },
    { ...input, bookingType: 'PACKAGE', packageId: 'silver', serviceIds: [] },
    { ...input, serviceIds: ['silver'] },
    { ...input, eventType: 'unknown' },
    { ...input, quantities: { candid: 2 } },
    { ...input, pricingStatus: 'CONFIRMED' },
    {
      ...input,
      serviceIds: ['drone', 'drone'],
    },
  ])
    assert.equal((await put(invalid)).status, 400);
  repository.fail = true;
  assert.equal((await put(input)).status, 503);
  repository.fail = false;
  const first = await (await put(input)).json();
  assert.equal(first.details.total, 15000);
  assert.equal(first.details.pricingStatus, 'DEVELOPMENT_SAMPLE');
  assert.equal(first.details.catalogueVersion, 'guided-sample-v4');
  assert.equal(first.details.items[0].unit, 'per ceremony');
  assert.equal(first.tokenHash, undefined);
  assert.equal((await (await put(input)).json()).revision, first.revision);
  assert.equal((await put(input, `Bearer ${'b'.repeat(64)}`)).status, 404);
  const edit = await (
    await put({
      ...input,
      ceremonies: [{ ...input.ceremonies[0], serviceIds: ['drone'] }],
      albumQuantity: 1,
    })
  ).json();
  assert.equal(edit.details.total, 18000);
  const confirm = (revision: string) =>
    call(`enquiries/${id}/confirm`, 'POST', { revision }, { Authorization });
  assert.equal((await confirm(first.revision)).status, 409);
  const results = await Promise.all([
    confirm(edit.revision),
    confirm(edit.revision),
  ]);
  for (const result of results)
    assert.equal((await result.json()).status, 'CONFIRMED');
  assert.equal(repository.records.size, 1);
  assert.equal((await put(input)).status, 409);
  await seedAdmin(authRepository, 'owner@example.test', password);
  const login = await call('auth/login', 'POST', {
    email: 'owner@example.test',
    password,
  });
  const Cookie = login.headers.get('set-cookie')!.split(';')[0];
  const details = await (
    await call(`admin/enquiries/${id}`, 'GET', undefined, { Cookie })
  ).json();
  assert.equal(details.status, 'CONFIRMED');
  assert.equal(details.details.total, 18000);
  assert.equal(details.tokenHash, undefined);
});

test('pricing writes require a valid admin session and same-origin request', async () => {
  let updates = 0;
  const pricing = {
    get: async () => ({ prices: { candid: 20000 }, revision: 'test' }),
    update: async () => {
      updates++;
      return { prices: { candid: 22000 }, revision: 'updated' };
    },
  };
  const { call, auth, authRepository } = fixture(pricing);
  assert.equal((await call('pricing')).status, 200);
  assert.equal((await call('pricing', 'PUT', {})).status, 405);
  assert.equal((await call('admin/pricing', 'PUT', {})).status, 401);
  assert.equal(
    (
      await call('admin/pricing', 'GET', undefined, {
        Cookie: 'studio_admin_session=' + 'a'.repeat(64),
      })
    ).status,
    401,
  );
  await seedAdmin(authRepository, 'prices@example.test', password);
  const token = await auth.login({ email: 'prices@example.test', password });
  const headers = { Cookie: SESSION_COOKIE + '=' + token };
  assert.equal(
    (
      await call(
        'admin/pricing',
        'PUT',
        {},
        { ...headers, Origin: 'https://other.test' },
      )
    ).status,
    403,
  );
  assert.equal(updates, 0);
  assert.equal((await call('admin/pricing', 'PUT', {}, headers)).status, 200);
  assert.equal(updates, 1);
  await auth.logout(token);
  assert.equal((await call('admin/pricing', 'PUT', {}, headers)).status, 401);
});
