import { RequestsDashboard } from '@/features/admin/requests-dashboard';
import { requireAdmin } from '@/server/admin-session';
export default async function RequestsPage() {
  await requireAdmin();
  return <RequestsDashboard />;
}
