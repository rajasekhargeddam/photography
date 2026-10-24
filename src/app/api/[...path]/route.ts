import { createApi } from '@/server/api';
import { database } from '@/server/database';
import { after } from 'next/server';
import { createNotificationTrigger } from '@/server/notification-trigger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const api = createApi(database);
const shouldCheckNotifications = createNotificationTrigger();
async function handler(request: Request) {
  const response = await api(request);
  const path = new URL(request.url).pathname;
  if (shouldCheckNotifications(request.method, path, response.ok)) {
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
