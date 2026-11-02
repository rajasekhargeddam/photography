import { createApi } from '@/server/api';
import { withDatabase } from '@/server/database';
import { publicRevision } from '@/server/public-revision';
import { withPublicCache } from '@/server/public-cache';
import { after } from 'next/server';
import { createNotificationTrigger } from '@/server/notification-trigger';
import { telegramEnabled } from '@/server/telegram-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const shouldCheckNotifications = createNotificationTrigger();
async function handler(request: Request) {
  const edgeCache =
    typeof caches === 'undefined'
      ? undefined
      : (caches as CacheStorage & { default?: Cache }).default;
  const response = await withDatabase((getDatabase) =>
    withPublicCache(
      request,
      () => createApi(getDatabase)(request),
      edgeCache,
      () =>
        publicRevision(
          new URL(request.url).origin,
          async () => (await getDatabase()).publication.current(),
          edgeCache,
        ),
    ),
  );
  const path = new URL(request.url).pathname;
  if (
    telegramEnabled() &&
    shouldCheckNotifications(request.method, path, response.ok)
  ) {
    after(async () => {
      try {
        await withDatabase(async (getDatabase) =>
          (await getDatabase()).drainTelegram(),
        );
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
