import { createApi } from '@/server/api';
import { database } from '@/server/database';
import { after } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const api = createApi(database);
async function handler(request: Request) {
  const response = await api(request);
  const path = new URL(request.url).pathname;
  if (
    response.ok &&
    (path === '/api/callbacks' ||
      path.endsWith('/confirm') ||
      path.startsWith('/api/admin/'))
  ) {
    after(async () => {
      try {
        await (await database()).drainTelegram();
      } catch {
        console.warn(
          'Telegram dispatcher unavailable; saved requests remain intact.',
        );
      }
    });
  }
  return response;
}
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
