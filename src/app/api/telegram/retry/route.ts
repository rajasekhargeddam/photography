import { timingSafeEqual } from 'node:crypto';
import { database } from '@/server/database';

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
  try {
    await (await database()).drainTelegram();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Retry unavailable' }, { status: 503 });
  }
}
