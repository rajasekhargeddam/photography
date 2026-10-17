import { createApi } from '@/server/api';
import { database } from '@/server/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handler = createApi(database);
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
