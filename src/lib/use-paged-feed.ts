'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Shared no-cache pagination. Revisit/focus refreshes admin-managed content. */
export function usePagedFeed<T extends { _id: string }>(
  endpoint: string,
  pageSize = 30,
  {
    enabled = true,
    refreshOnFocus = true,
  }: { enabled?: boolean; refreshOnFocus?: boolean } = {},
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const loadedEndpoint = useRef('');
  const nextOffset = useRef(0);
  const retryOffset = useRef(0);
  const pending = useRef(false);
  const active = useRef<AbortController | null>(null);
  const load = useCallback(
    async (offset = 0) => {
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      setLoading(true);
      setError('');
      retryOffset.current = offset;
      pending.current = true;
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
        const data: { items: T[]; total?: number; hasMore?: boolean } =
          await response.json();
        if (!Array.isArray(data.items))
          throw new Error('Unable to read this content. Please try again.');
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
          nextOffset.current = offset + data.items.length;
          loadedEndpoint.current = endpoint;
          setTotal(typeof data.total === 'number' ? data.total : null);
          setMore(data.hasMore ?? data.items.length === pageSize);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError((cause as Error).message);
      } finally {
        if (!controller.signal.aborted) {
          pending.current = false;
          setLoading(false);
        }
      }
    },
    [endpoint, pageSize],
  );
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      void load();
    };
    if (loadedEndpoint.current !== endpoint) refresh();
    else if (pending.current) void load(retryOffset.current);
    if (refreshOnFocus) window.addEventListener('focus', refresh);
    return () => {
      active.current?.abort();
      window.removeEventListener('focus', refresh);
    };
  }, [load, endpoint, enabled, refreshOnFocus]);
  return {
    items,
    loading,
    error,
    more,
    total,
    reload: () => load(),
    retry: () => load(retryOffset.current),
    loadMore: () => {
      if (!loading) return load(nextOffset.current);
    },
  };
}
