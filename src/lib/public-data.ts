export const PUBLIC_STALE_MS = 300_000;
export const homeFeeds: Record<string, string> = {
  '/api/content/hero?limit=5': 'hero',
  '/api/content/gallery?limit=8': 'gallery',
  '/api/content/testimonials?limit=3': 'testimonials',
  '/api/content/videos?limit=1': 'videos',
};
export type FeedPage<T> = { items: T[]; total?: number; hasMore?: boolean };
export async function fetchPublicJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok)
    throw new Error('Unable to load this content. Please try again.');
  return response.json();
}
export function nextOffset<T>(page: FeedPage<T>, offset: number, size: number) {
  return page.items.length && (page.hasMore ?? page.items.length === size)
    ? offset + page.items.length
    : undefined;
}

export async function fetchHome(
  signal?: AbortSignal,
): Promise<Record<string, FeedPage<{ _id: string }>>> {
  const data = await fetchPublicJson('/api/home', signal);
  for (const key of Object.values(homeFeeds)) {
    if (!data?.[key] || !Array.isArray(data[key].items)) {
      throw new Error('Unable to read homepage content. Please try again.');
    }
  }
  return data;
}
