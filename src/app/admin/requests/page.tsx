import { AdminInbox } from '@/features/admin/inbox';
import { requireAdmin } from '@/server/admin-session';
export default async function RequestsPage() {
  await requireAdmin();
  return <AdminInbox />;
}
