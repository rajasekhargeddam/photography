'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  categories,
  MAX_IMAGE_BYTES,
  type ContentKind,
  type ContentRecord,
} from '../content/model';

const titles = {
  gallery: 'Portfolio',
  hero: 'Home hero',
  testimonials: 'Testimonials',
  videos: 'Videos',
};
async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'Your session expired. Sign in again to continue.'
        : (body.message ?? 'Request failed. Please retry.'),
    );
  return body;
}
export function ContentManager({ kind }: { kind: ContentKind }) {
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const endpoint = `/api/admin/content/${kind}`;
  const load = useCallback(
    async (offset = 0) => {
      setLoading(true);
      try {
        const data: { items: ContentRecord[] } = await api(
          `${endpoint}?offset=${offset}`,
        );
        setItems((old) => (offset ? [...old, ...data.items] : data.items));
        setMore(data.items.length === 30);
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [endpoint],
  );
  useEffect(() => {
    const abort = new AbortController();
    api(endpoint, { signal: abort.signal })
      .then((data: { items: ContentRecord[] }) => {
        setItems(data.items);
        setMore(data.items.length === 30);
      })
      .catch((cause) => {
        if (!abort.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [endpoint]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (kind === 'gallery' || kind === 'hero') {
        const file = data.get('file');
        if (
          !(file instanceof File) ||
          !file.size ||
          file.size > MAX_IMAGE_BYTES
        )
          throw new Error('Choose a JPEG, PNG or WebP image up to 4 MB.');
      }
      await api(endpoint, {
        method: 'POST',
        ...(kind === 'gallery' || kind === 'hero'
          ? { body: data }
          : {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(Object.fromEntries(data)),
            }),
      });
      form.reset();
      setNotice('Saved successfully.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      await load();
      setBusy(false);
    }
  }
  async function remove(item: ContentRecord) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`${endpoint}/${item._id}`, { method: 'DELETE' });
      setNotice('Deleted successfully.');
      setDeleting(null);
      await load();
    } catch (cause) {
      setError((cause as Error).message);
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
              ? 'Upload up to five landscape photos. Newest appears first; images rotate every six seconds. Delete a photo to replace it. If empty, the default photo is shown.'
              : 'Add content and remove entries you no longer want.'}
          </p>
        </div>
        <button
          disabled={loading || busy}
          onClick={() => {
            setError('');
            void load();
          }}
        >
          Refresh
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error} <a href="/admin/login">Admin login</a>
        </p>
      )}
      <p role="status" aria-live="polite">
        {notice}
      </p>
      <form className="content-form" onSubmit={submit}>
        <h2>
          Add{' '}
          {kind === 'gallery' || kind === 'hero'
            ? 'photo'
            : kind === 'videos'
              ? 'video'
              : 'testimonial'}
        </h2>
        <fieldset
          disabled={busy || (kind === 'hero' && (loading || items.length >= 5))}
        >
          {kind === 'gallery' || kind === 'hero' ? (
            <>
              <label>
                Photo{' '}
                <input
                  name="file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                />
                <small>JPEG, PNG or WebP · maximum 4 MB</small>
              </label>
              {kind === 'gallery' && (
                <label>
                  Category{' '}
                  <select name="category" required>
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : kind === 'testimonials' ? (
            <>
              <label>
                Person name <input name="name" maxLength={100} required />
              </label>
              <label>
                Review date <input name="date" type="date" required />
              </label>
              <label>
                Review{' '}
                <textarea name="text" maxLength={3000} rows={5} required />
              </label>
            </>
          ) : (
            <>
              <label>
                Video title <input name="title" maxLength={150} required />
              </label>
              <label>
                YouTube link{' '}
                <input
                  name="url"
                  type="url"
                  maxLength={500}
                  required
                  placeholder="https://www.youtube.com/watch?v=…"
                />
              </label>
            </>
          )}
          <button type="submit">
            {busy
              ? 'Working…'
              : kind === 'gallery' || kind === 'hero'
                ? 'Upload photo'
                : 'Save'}
          </button>
        </fieldset>
      </form>
      <h2>Saved {titles[kind].toLowerCase()}</h2>
      {loading && <p role="status">Loading…</p>}
      {!loading && !items.length && (
        <p>No entries yet. Add your first one above.</p>
      )}
      <div className="content-grid">
        {items.map((item) => (
          <article className="content-card" key={item._id}>
            {(item.kind === 'gallery' || item.kind === 'hero') && item.url && (
              <Image
                src={item.url}
                alt={item.alt ?? ''}
                width={item.width ?? 512}
                height={item.height ?? 286}
                unoptimized
              />
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
            {item.state === 'pending' && (
              <p role="status">
                Pending upload. If it did not finish, wait two minutes then
                delete this entry and upload again.
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
    </section>
  );
}
