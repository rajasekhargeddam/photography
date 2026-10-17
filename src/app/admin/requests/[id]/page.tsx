import { AdminInbox } from '@/features/admin/inbox';
import { requireAdmin } from '@/server/admin-session';
export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  return <AdminInbox id={id} />;
}
