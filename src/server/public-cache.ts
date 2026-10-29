import { checkOrigin, guarded } from './http';

type PublicCache = Pick<Cache, 'match' | 'put'>;
import { publicCacheKey } from '../lib/public-cache-key';
export { publicCacheKey } from '../lib/public-cache-key';
export async function withPublicCache(
  request: Request,
  load: () => Promise<Response>,
  cache?: PublicCache,
  getRevision?: () => Promise<string>,
) {
  return guarded(async () => {
    // Validate before cache lookup, so cache hits cannot bypass origin checks.
    checkOrigin(request);
    const key = publicCacheKey(request);
    if (!key) return load();
    let versionedKey = key;
    if (getRevision) {
      try {
        const revision = await getRevision();
        const url = new URL(key.url);
        url.searchParams.set('__publication', revision);
        versionedKey = new Request(url);
      } catch {
        // Never serve an old namespace when publication state cannot be checked.
        return load();
      }
    }
    if (cache) {
      try {
        const hit = await cache.match(versionedKey);
        if (hit) {
          const response = new Response(hit.body, hit);
          response.headers.set('X-Public-Cache', 'HIT');
          response.headers.set(
            'Cache-Control',
            'public, max-age=0, must-revalidate',
          );
          return response;
        }
      } catch {
        /* Cache outages must not prevent a live read. */
      }
    }
    const response = await load();
    if (response.status !== 200 || response.headers.has('set-cookie'))
      return response;
    // Browser must revalidate; Query handles browser reuse. Edge entries expire after 5 min.
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    response.headers.set('X-Public-Cache', cache ? 'MISS' : 'BYPASS');
    if (cache) {
      try {
        const stored = response.clone();
        stored.headers.set('Cache-Control', 'public, max-age=300');
        await cache.put(versionedKey, stored);
      } catch {
        /* Best effort. */
      }
    }
    return response;
  });
}
