type RevisionCache = Pick<Cache, 'match' | 'put'>;
const TTL = 60_000;
export async function publicRevision(
  origin: string,
  read: () => Promise<string>,
  cache?: RevisionCache,
  now = Date.now,
) {
  const key = new Request(
    new URL('/__internal/public-content-revision-v1', origin),
  );
  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) {
        const record = (await hit.json()) as {
          revision: string;
          expiresAt: number;
        };
        if (/^\d+$/.test(record.revision) && record.expiresAt > now())
          return record.revision;
      }
    } catch {
      /* Read the authoritative record when cache is unavailable. */
    }
  }
  const revision = await read();
  if (!/^\d+$/.test(revision)) throw new Error('Invalid publication revision');
  if (cache) {
    try {
      await cache.put(
        key,
        Response.json(
          { revision, expiresAt: now() + TTL },
          { headers: { 'Cache-Control': 'public, max-age=60' } },
        ),
      );
    } catch {
      /* Cache is optional; the database revision remains authoritative. */
    }
  }
  return revision;
}
