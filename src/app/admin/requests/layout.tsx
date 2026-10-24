import type { ReactNode } from 'react';
import { requireAdmin } from '@/server/admin-session';
import { AdminShell } from '@/features/admin/admin-shell';
export const dynamic = 'force-dynamic';
export default async function RequestsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
