/** Explicit allowlist: never cache authentication, customer records, errors or mutations. */
export function publicCacheKey(request: Request): Request | undefined {
  if (
    request.method !== 'GET' ||
    request.headers.has('authorization') ||
    request.headers.has('cookie')
  )
    return;
  const url = new URL(request.url);
  if (
    !/^\/api\/(home|pricing|content\/(hero|gallery|videos|testimonials))$/.test(
      url.pathname,
    )
  )
    return;
  const allowed = url.pathname.startsWith('/api/content/')
    ? ['offset', 'limit', 'pagination', 'category']
    : [];
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1)
      return;
  }
  url.searchParams.sort();
  return new Request(url, { method: 'GET' });
}
