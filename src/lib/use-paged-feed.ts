'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Shared no-cache pagination. Revisit/focus refreshes admin-managed content. */
export function usePagedFeed<T extends { _id: string }>(
  endpoint: string,
  pageSize = 30,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const active = useRef<AbortController | null>(null);
  const load = useCallback(
    async (offset = 0) => {
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      setLoading(true);
      setError('');
      try {
        const response = await fetch(
          `${endpoint}${endpoint.includes('?') ? '&' : '?'}offset=${offset}`,
          { cache: 'no-store', signal: controller.signal },
        );
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? 'Please sign in again to view requests.'
              : 'Unable to load this content. Please try again.',
          );
        const data: { items: T[] } = await response.json();
        if (!controller.signal.aborted) {
          setItems((old) =>
            offset
              ? [
                  ...new Map(
                    [...old, ...data.items].map((item) => [item._id, item]),
                  ).values(),
                ]
              : data.items,
          );
          setMore(data.items.length === pageSize);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError((cause as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [endpoint, pageSize],
  );
  useEffect(() => {
    const refresh = () => {
      void load();
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      active.current?.abort();
      window.removeEventListener('focus', refresh);
    };
  }, [load]);
  return {
    items,
    loading,
    error,
    more,
    reload: () => load(),
    loadMore: () => load(items.length),
  };
}
