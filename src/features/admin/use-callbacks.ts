'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { CallbackRequest } from '../contact/model';
export function useCallbacks() {
  const query = useInfiniteQuery({
    queryKey: ['admin-callbacks'],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }): Promise<CallbackRequest[]> => {
      const response = await fetch('/api/admin/callbacks?offset=' + pageParam, {
        cache: 'no-store',
        signal,
      });
      if (response.status === 401 || response.status === 403) {
        window.location.replace('/admin/login');
        throw new Error('Please sign in again.');
      }
      if (!response.ok)
        throw new Error('Unable to load call requests. Please try again.');
      const data = await response.json();
      if (!Array.isArray(data.items))
        throw new Error('Unable to read call requests.');
      return data.items;
    },
    getNextPageParam: (page, _pages, offset) =>
      page.length === 30 ? offset + 30 : undefined,
  });
  return {
    items: [
      ...new Map(
        (query.data?.pages.flat() ?? []).map((item) => [item._id, item]),
      ).values(),
    ],
    loading: query.isFetching,
    error: query.error?.message ?? '',
    more: query.hasNextPage,
    reload: () => query.refetch(),
    retry: () =>
      query.isFetchNextPageError ? query.fetchNextPage() : query.refetch(),
    loadMore: () => {
      if (!query.isFetching) return query.fetchNextPage();
    },
  };
}
