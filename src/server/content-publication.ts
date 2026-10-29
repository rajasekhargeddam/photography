import { timingSafeEqual } from 'node:crypto';
import type { Collection } from 'mongodb';
import { json } from './http';
export type PublicationRecord = {
  _id: string;
  revision: number;
  publishedAt: string;
};
export class ContentPublication {
  constructor(private readonly records: Collection<PublicationRecord>) {}
  async current() {
    const record = await this.records.findOne({ _id: 'public-content' });
    return String(record?.revision ?? 0);
  }
  async publish() {
    const record = await this.records.findOneAndUpdate(
      { _id: 'public-content' },
      {
        $inc: { revision: 1 },
        $set: { publishedAt: new Date().toISOString() },
      },
      { upsert: true, returnDocument: 'after' },
    );
    if (!record) throw new Error('Publication unavailable');
    return String(record.revision);
  }
}
export async function publishContent(
  request: Request,
  publish: () => Promise<string>,
  secret = process.env.CONTENT_PUBLISH_SECRET,
) {
  if (request.method !== 'POST')
    return json({ message: 'Method not allowed.' }, 405);
  if (!secret || secret.length < 32)
    return json({ message: 'Publishing is not configured.' }, 503);
  const expected = Buffer.from('Bearer ' + secret);
  const provided = Buffer.from(request.headers.get('authorization') ?? '');
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    return json({ message: 'Unauthorized.' }, 401);
  // CLI endpoint: no cookies, browser-origin credentials or request body required.
  try {
    const revision = await publish();
    return json({
      success: true,
      revision,
      edgeRefreshSeconds: 60,
      browserRefreshRequired: true,
    });
  } catch {
    return json({ message: 'Publishing unavailable. Retry the command.' }, 503);
  }
}
