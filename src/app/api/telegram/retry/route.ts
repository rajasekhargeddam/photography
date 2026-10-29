import { timingSafeEqual } from 'node:crypto';
import { withDatabase } from '@/server/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_RETRY_SECRET;
  const provided = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret ?? ''}`);
  if (
    !secret ||
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (
    !process.env.TELEGRAM_BOT_TOKEN ||
    !process.env.TELEGRAM_CHAT_ID ||
    Number.isNaN(Date.parse(process.env.TELEGRAM_ALERTS_SINCE ?? ''))
  )
    return Response.json(
      { error: 'Telegram delivery is not configured' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  try {
    await withDatabase(async (getDatabase) =>
      (await getDatabase()).drainTelegram(),
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Retry unavailable' }, { status: 503 });
  }
}
