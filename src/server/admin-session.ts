import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from './auth';
import { database } from './database';

export async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/admin/login');
  const { auth } = await database();
  const admin = await auth.current(token);
  if (!admin) redirect('/admin/login');
  return admin;
}
