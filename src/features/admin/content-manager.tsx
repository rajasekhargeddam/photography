'use client';
import Image from 'next/image';
import { AdminPhotoPreview } from './photo-preview';
import {
  isCloudinaryPhoto,
  photographyImageLoader,
} from '@/lib/image-delivery';
import { PhotoBatchUpload } from './photo-batch-upload';
import { YouTubeThumbnail } from '@/components/ui/youtube-thumbnail';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  categories,
  youtubeId,
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
const titles = {
  gallery: 'Portfolio',
  hero: 'Home hero',
  testimonials: 'Testimonials',
  videos: 'Films',
};
class ContentRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
function contentError(cause: unknown) {
  return {
    message:
      cause instanceof Error
        ? cause.message
        : 'Request failed. Please try again.',
    requiresLogin: cause instanceof ContentRequestError && cause.status === 401,
  };
}
async function api(url: string, options?: RequestInit) {
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
export function ContentManager({ kind }: { kind: ContentKind }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [preview, setPreview] = useState<{
    photos: ContentRecord[];
    index: number;
  } | null>(null);
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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
  return (
    <section className="content-manager">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Studio content</p>
          <h1>{titles[kind]}</h1>
          <p className="muted">
            {kind === 'hero'
              ? 'Upload up to five landscape photos. Newest appears first; images rotate every six seconds. Delete a photo to replace it. If empty, a background matching the selected theme is shown.'
              : 'Add content and remove entries you no longer want.'}
          </p>
        </div>
        <button
          disabled={loading || busy}
          onClick={() => {
            setError(null);
            void load();
          }}
        >
          Refresh
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error.message}
          {error.requiresLogin && (
            <>
              {' '}
              <a href="/admin/login">Sign in again</a>
            </>
          )}
        </p>
      )}
      <p role="status" aria-live="polite">
        {notice}
      </p>
      {kind === 'gallery' || kind === 'hero' ? (
        <PhotoBatchUpload
          kind={kind}
          available={Math.max(0, 5 - items.length)}
          disabled={busy || (kind === 'hero' && loading)}
          request={api}
          onBusy={setBusy}
          onComplete={load}
          onError={(cause) => setError(contentError(cause))}
        />
      ) : (
        <form className="content-form" onSubmit={submit}>
          <h2>Add {kind === 'videos' ? 'film' : 'testimonial'}</h2>
          <fieldset disabled={busy}>
            {kind === 'testimonials' ? (
              <>
                <label>
                  Person name <input name="name" maxLength={100} required />
                </label>
                <label>
                  Testimonial date <input name="date" type="date" required />
                </label>
                <label>
                  Testimonial{' '}
                  <textarea name="text" maxLength={3000} rows={5} required />
                </label>
              </>
            ) : (
              <>
                <label>
                  Film title <input name="title" maxLength={150} required />
                </label>
                <label>
                  YouTube link{' '}
                  <input
                    name="url"
                    type="url"
                    maxLength={500}
                    required
                    placeholder="https://www.youtube.com/watch?v=…"
                    onChange={(event) => setVideoUrl(event.target.value)}
                  />
                </label>
                {youtubeId(videoUrl) && (
                  <div
                    className="admin-film-preview"
                    aria-label="Film thumbnail preview"
                  >
                    <YouTubeThumbnail
                      videoId={youtubeId(videoUrl)!}
                      alt="YouTube film thumbnail preview"
                    />
                  </div>
                )}
              </>
            )}
            <button type="submit">{busy ? 'Working…' : 'Save'}</button>
          </fieldset>
        </form>
      )}
      {kind === 'gallery' && (
        <div
          className="portfolio-categories"
          role="group"
          aria-label="Portfolio categories"
        >
          {['All', ...categories].map((value) => (
            <button
              type="button"
              key={value}
              disabled={busy}
              aria-pressed={category === value}
              onClick={() => {
                if (value === category) return;
                setLoading(true);
                setItems([]);
                setMore(false);
                setCategory(value);
                setDeleting(null);
                setError(null);
              }}
            >
              {value} (
              {counts.length
                ? value === 'All'
                  ? counts.reduce((sum, row) => sum + row.current, 0)
                  : (counts.find((row) => row.category === value)?.current ?? 0)
                : loading
                  ? '…'
                  : 'unavailable'}
              )
            </button>
          ))}
        </div>
      )}
      <h2>Saved {titles[kind].toLowerCase()}</h2>
      {loading && <p role="status">Loading…</p>}
      {!loading && !items.length && (
        <p>
          No entries in this selection. Add a photo or choose another category.
        </p>
      )}
      <div className="content-grid">
        {items.map((item) => (
          <article className="content-card" key={item._id}>
            {(item.kind === 'gallery' || item.kind === 'hero') && item.url && (
              <button
                className="admin-photo-thumbnail"
                type="button"
                aria-label={`Preview ${item.alt ?? 'photo'}`}
                onClick={() => {
                  const photos = items.filter(
                    (photo) =>
                      (photo.kind === 'gallery' || photo.kind === 'hero') &&
                      Boolean(photo.url),
                  );
                  setPreview({
                    photos,
                    index: photos.findIndex((photo) => photo._id === item._id),
                  });
                }}
              >
                <Image
                  src={item.url}
                  alt={item.alt ?? ''}
                  width={item.width ?? 512}
                  height={item.height ?? 286}
                  loader={
                    isCloudinaryPhoto(item.url)
                      ? photographyImageLoader
                      : undefined
                  }
                  unoptimized={!isCloudinaryPhoto(item.url)}
                  sizes="(max-width: 700px) 90vw, 320px"
                />
                <span>Preview photo</span>
              </button>
            )}
            {(item.kind === 'gallery' || item.kind === 'hero') && (
              <>
                <h3>{item.category}</h3>
                <p>{item.alt}</p>
              </>
            )}
            {item.kind === 'testimonials' && (
              <>
                <h3>{item.name}</h3>
                {item.date && <time dateTime={item.date}>{item.date}</time>}
                <p className="review-text">{item.text}</p>
              </>
            )}
            {item.kind === 'videos' && (
              <>
                <a
                  className="admin-film-thumbnail"
                  href={`https://www.youtube.com/watch?v=${item.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Preview ${item.title ?? 'film'} on YouTube`}
                >
                  <YouTubeThumbnail
                    videoId={item.videoId}
                    alt={item.title ?? 'Film thumbnail'}
                  />
                </a>
                <h3>{item.title}</h3>
                <a
                  href={`https://www.youtube.com/watch?v=${item.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview on YouTube ↗
                </a>
              </>
            )}
            {item.sample && <p className="muted">Development sample</p>}
            {item.kind === 'gallery' &&
              item.state === 'ready' &&
              (editingCategory === item._id ? (
                <div
                  className="photo-category-editor"
                  role="group"
                  aria-label="Change photo category"
                >
                  <label htmlFor={`category-${item._id}`}>Photo category</label>
                  <select
                    id={`category-${item._id}`}
                    value={newCategory}
                    disabled={busy || loading}
                    onChange={(event) => setNewCategory(event.target.value)}
                  >
                    {categories.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <div className="photo-category-actions">
                    <button
                      type="button"
                      disabled={
                        busy || loading || newCategory === item.category
                      }
                      onClick={() => void saveCategory(item)}
                    >
                      Save category
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingCategory(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy || loading}
                  onClick={() => {
                    setEditingCategory(item._id);
                    setNewCategory(item.category ?? 'Others');
                    setDeleting(null);
                  }}
                  aria-label={`Change category of ${item.alt ?? 'photo'}`}
                >
                  Change category
                </button>
              ))}
            {item.state === 'pending' && (
              <p role="status">
                Pending upload. Retry with the same selected photo to finish it.
                {item.uploadExpiresAt
                  ? ' If interrupted, this entry can be removed after ' +
                    new Date(item.uploadExpiresAt).toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) +
                    ' IST.'
                  : ' If interrupted, wait two minutes before removing it.'}
              </p>
            )}
            {deleting === item._id ? (
              <div role="group" aria-label="Confirm deletion">
                <p>Delete this entry permanently?</p>
                <button
                  disabled={busy || loading}
                  onClick={() => void remove(item)}
                >
                  Confirm delete
                </button>
                <button disabled={busy} onClick={() => setDeleting(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                disabled={busy || loading}
                onClick={() => setDeleting(item._id)}
                aria-label={`Delete ${item.alt ?? item.title ?? item.name}`}
              >
                Delete
              </button>
            )}
          </article>
        ))}
      </div>
      {more && (
        <button
          disabled={loading || busy}
          onClick={() => void load(items.length)}
        >
          Load more
        </button>
      )}
      {preview && (
        <AdminPhotoPreview
          photos={preview.photos}
          initialIndex={preview.index}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}
