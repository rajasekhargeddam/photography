import { publicCacheKey } from './public-cache-key';
/** A cache-only fast path. Misses/private traffic retain the complete Next.js handler. */
export async function edgePublicHit(
  request: Request,
  cache: Pick<Cache, 'match'>,
  expectedOrigin?: string,
  now = Date.now,
): Promise<Response | undefined> {
  const origin = request.headers.get('origin');
  if (
    (origin && origin !== (expectedOrigin ?? new URL(request.url).origin)) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    return;
  const key = publicCacheKey(request);
  if (!key) return;
  try {
    const revisionHit = await cache.match(
      new Request(
        new URL('/__internal/public-content-revision-v1', request.url),
      ),
    );
    if (!revisionHit) return;
    const state = (await revisionHit.json()) as {
      revision: string;
      expiresAt: number;
    };
    if (!/^\d+$/.test(state.revision) || !(state.expiresAt > now())) return;
    const url = new URL(key.url);
    url.searchParams.set('__publication', state.revision);
    const hit = await cache.match(new Request(url));
    if (!hit || hit.status !== 200 || hit.headers.has('set-cookie')) return;
    const response = new Response(hit.body, hit);
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    response.headers.set('X-Public-Cache', 'HIT');
    response.headers.set('X-Public-Path', 'edge');
    return response;
  } catch {
    return;
  }
}
