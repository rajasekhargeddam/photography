'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import {
  fetchPublicJson,
  fetchHome,
  homeFeeds,
  nextOffset,
  PUBLIC_STALE_MS,
  type FeedPage,
} from './public-data';

/** Public-only, memory-cached pagination. Private admin feeds use a separate hook. */
export function usePagedFeed<T extends { _id: string }>(
  endpoint: string,
  pageSize = 30,
  {
    enabled = true,
    refreshOnFocus = false,
  }: { enabled?: boolean; refreshOnFocus?: boolean } = {},
) {
  const pathname = usePathname();
  const section = pathname === '/' ? homeFeeds[endpoint] : undefined;
  const home = useQuery<Record<string, FeedPage<T>>>({
    queryKey: ['public-home'],
    enabled: enabled && !!section,
    staleTime: PUBLIC_STALE_MS,
    queryFn: async ({ signal }) =>
      (await fetchHome(signal)) as Record<string, FeedPage<T>>,
  });
  const query = useInfiniteQuery({
    queryKey: ['public-feed', endpoint],
    initialPageParam: 0,
    enabled: enabled && !section,
    staleTime: PUBLIC_STALE_MS,
    refetchOnWindowFocus: refreshOnFocus,
    queryFn: async ({ pageParam, signal }): Promise<FeedPage<T>> => {
      const page: FeedPage<T> = await fetchPublicJson(
        endpoint + (endpoint.includes('?') ? '&' : '?') + 'offset=' + pageParam,
        signal,
      );
      if (!page || !Array.isArray(page.items))
        throw new Error('Unable to read this content. Please try again.');
      return page;
    },
    getNextPageParam: (lastPage, _pages, offset) =>
      nextOffset(lastPage, offset, pageSize),
  });
  if (section) {
    const page = home.data?.[section];
    return {
      items: page?.items ?? [],
      loading: enabled && home.isFetching,
      error: home.error?.message ?? '',
      more: false,
      total: page?.total ?? null,
      reload: () => home.refetch(),
      retry: () => home.refetch(),
      loadMore: () => undefined,
    };
  }
  const items = [
    ...new Map(
      (query.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [
        item._id,
        item,
      ]),
    ).values(),
  ];
  return {
    items,
    loading: enabled && query.isFetching,
    error: query.error?.message ?? '',
    more: query.hasNextPage,
    total: query.data?.pages[0]?.total ?? null,
    reload: () => query.refetch(),
    retry: () =>
      query.isFetchNextPageError ? query.fetchNextPage() : query.refetch(),
    loadMore: () => {
      if (!query.isFetching) return query.fetchNextPage();
    },
  };
}
