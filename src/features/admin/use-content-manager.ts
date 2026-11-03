import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  categories,
  type ContentKind,
  type ContentRecord,
} from '../content/model';
type CategoryCount = {
  category: string;
  current: number;
  pending: number;
  removed: number;
};
type ContentResponse = {
  items: ContentRecord[];
  categoryCounts?: CategoryCount[];
};
class ContentRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export function contentError(cause: unknown) {
  return {
    message:
      cause instanceof Error
        ? cause.message
        : 'Request failed. Please try again.',
    requiresLogin: cause instanceof ContentRequestError && cause.status === 401,
  };
}
export async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok)
    throw new ContentRequestError(
      response.status === 401
        ? 'Your session expired. Sign in again to continue.'
        : (body.message ?? 'Request failed. Please try again.'),
      response.status,
    );
  return body;
}

export function useContentManager(kind: ContentKind) {
  const [videoUrl, setVideoUrl] = useState('');
  const [preview, setPreview] = useState<{
    photos: ContentRecord[];
    index: number;
  } | null>(null);
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState<string>(categories[0]);
  const [bulkProgress, setBulkProgress] = useState('');
  const [error, setError] = useState<ReturnType<typeof contentError> | null>(
    null,
  );
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<string>('Others');
  const [more, setMore] = useState(false);
  const [category, setCategory] = useState('All');
  const [counts, setCounts] = useState<CategoryCount[]>([]);
  const endpoint = `/api/admin/content/${kind}`;
  const listEndpoint = `${endpoint}?${category === 'All' ? '' : `category=${encodeURIComponent(category)}`}`;
  const load = useCallback(
    async (offset = 0) => {
      setLoading(true);
      try {
        const data: ContentResponse = await api(
          `${listEndpoint}&offset=${offset}`,
        );
        setItems((old) => (offset ? [...old, ...data.items] : data.items));
        setMore(data.items.length === 30);
        if (kind === 'gallery' && !data.categoryCounts) {
          throw new Error(
            'Photo counts are unavailable. Restart the application server, then refresh this page.',
          );
        }
        setCounts(data.categoryCounts ?? []);
      } catch (cause) {
        setError(contentError(cause));
      } finally {
        setLoading(false);
      }
    },
    [listEndpoint, kind],
  );
  useEffect(() => {
    const abort = new AbortController();
    api(listEndpoint, { signal: abort.signal })
      .then((data: ContentResponse) => {
        if (abort.signal.aborted) return;
        setItems(data.items);
        setMore(data.items.length === 30);
        if (kind === 'gallery' && !data.categoryCounts) {
          throw new Error(
            'Photo counts are unavailable. Restart the application server, then refresh this page.',
          );
        }
        setCounts(data.categoryCounts ?? []);
      })
      .catch((cause) => {
        if (!abort.signal.aborted) setError(contentError(cause));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [listEndpoint, kind]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(null);
    setNotice('');
    setBusy(true);
    try {
      await api(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      form.reset();
      setVideoUrl('');
      setNotice('Saved successfully.');
    } catch (cause) {
      setError(contentError(cause));
    } finally {
      await load();
      setBusy(false);
    }
  }
  async function remove(item: ContentRecord) {
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      await api(`${endpoint}/${item._id}`, { method: 'DELETE' });
      setNotice('Deleted successfully.');
      setDeleting(null);
      await load();
    } catch (cause) {
      setError(contentError(cause));
    } finally {
      setBusy(false);
    }
  }
  async function applyBulkCategory() {
    if (busy || !selected.length) return;
    setBusy(true);
    setError(null);
    setNotice('');
    const photos = items.filter(
      (item) => selected.includes(item._id) && item.state === 'ready',
    );
    const succeeded: string[] = [];
    try {
      for (const [index, item] of photos.entries()) {
        setBulkProgress(`Updating ${index + 1} of ${photos.length}…`);
        if (item.category !== bulkCategory)
          await api(`${endpoint}/${item._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: bulkCategory,
              previousCategory: item.category,
            }),
          });
        succeeded.push(item._id);
      }
      setNotice(`${succeeded.length} photos are now in ${bulkCategory}.`);
    } catch (cause) {
      setError(contentError(cause));
      setNotice(
        `${succeeded.length} updates confirmed. Review the refreshed list and select any remaining photos to retry.`,
      );
    } finally {
      setSelected([]);
      setBulkProgress('');
      await load();
      setBusy(false);
    }
  }
  async function saveCategory(item: ContentRecord) {
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      await api(`${endpoint}/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          previousCategory: item.category,
        }),
      });
      setEditingCategory(null);
      setNotice(
        `Photo category changed to ${newCategory}.${category !== 'All' && category !== newCategory ? ' The photo is now in its new category.' : ''}`,
      );
      await load();
    } catch (cause) {
      setError(contentError(cause));
    } finally {
      setBusy(false);
    }
  }
  return {
    videoUrl,
    setVideoUrl,
    preview,
    setPreview,
    items,
    setItems,
    loading,
    setLoading,
    busy,
    setBusy,
    selected,
    setSelected,
    bulkCategory,
    setBulkCategory,
    bulkProgress,
    error,
    setError,
    notice,
    deleting,
    setDeleting,
    editingCategory,
    setEditingCategory,
    newCategory,
    setNewCategory,
    more,
    setMore,
    category,
    setCategory,
    counts,
    load,
    submit,
    remove,
    applyBulkCategory,
    saveCategory,
  };
}
