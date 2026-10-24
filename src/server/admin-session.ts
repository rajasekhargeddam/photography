import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from './auth';
import { database } from './database';

// React cache is scoped to this render, never shared between users or requests.
export const requireAdmin = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/admin/login');
  const { auth } = await database();
  const admin = await auth.current(token);
  if (!admin) redirect('/admin/login');
  return admin;
});
