'use client';
import { uiCopy } from '@/config/copy';
import { useState } from 'react';
import { categories, type ContentRecord } from './model';
import { usePagedFeed } from '@/lib/use-paged-feed';
import { GalleryLightbox } from '@/features/gallery/components/gallery-lightbox';
import { YouTubeThumbnail } from '@/components/ui/youtube-thumbnail';

function FeedStatus({
  feed,
  empty,
  paginated = true,
  label,
}: {
  feed: ReturnType<typeof usePagedFeed<ContentRecord>>;
  empty: string;
  paginated?: boolean;
  label?: 'pictures' | 'films';
}) {
  return (
    <div
      className={`feed-status${label ? ' portfolio-pagination' : ''}${label && feed.more ? ' portfolio-pagination--more' : ''}`}
    >
      {label && feed.items.length > 0 && (
        <p className="collection-count" aria-live="polite">
          Showing {feed.items.length}
          {feed.total !== null ? ` of ${feed.total}` : ''}{' '}
          {feed.total === 1 ? label.slice(0, -1) : label}
        </p>
      )}
      {feed.error && (
        <div role="alert">
          <p>{feed.error}</p>
          <button
            className="button button--outline"
            onClick={() => void feed.retry()}
            disabled={feed.loading}
          >
            {uiCopy.actions.tryAgain}
          </button>
        </div>
      )}
      {feed.loading && !(feed.more && paginated && !feed.error) && (
        <p role="status">Loading…</p>
      )}
      {!feed.loading && !feed.error && !feed.items.length && <p>{empty}</p>}
      {!feed.error && feed.more && paginated && (
        <button
          className={`button ${label === 'pictures' ? 'button--primary portfolio-more-button' : 'button--outline'}`}
          disabled={feed.loading}
          onClick={() => void feed.loadMore()}
        >
          {feed.loading
            ? 'Loading…'
            : label
              ? `Load more ${label}`
              : 'Load more'}
          {label === 'pictures' && <span aria-hidden="true">↓</span>}
        </button>
      )}
    </div>
  );
}
function PhotoCollection({
  category,
  limit,
  view,
  active = true,
}: {
  category: string;
  limit?: number;
  view: 'editorial' | 'grid';
  active?: boolean;
}) {
  const params = new URLSearchParams({ limit: String(limit ?? 12) });
  if (!limit) params.set('pagination', '1');
  if (category !== 'All') params.set('category', category);
  const feed = usePagedFeed<ContentRecord>(
    `/api/content/gallery?${params}`,
    limit ?? 12,
    { enabled: active, refreshOnFocus: false },
  );
  return (
    <>
      {limit && (
        <p className="collection-count" role="status">
          {!feed.loading && !feed.error
            ? `${feed.items.length} ${category === 'All' ? '' : `${category} `}photos${feed.more && !limit ? ' loaded' : ''}`
            : ''}
        </p>
      )}
      {feed.items.some((photo) => photo.sample) && (
        <p className="collection-count">Includes sample photography.</p>
      )}
      <div
        className={`collection-window${feed.more && !limit && feed.items.length ? ' collection-window--more' : ''}`}
      >
        <GalleryLightbox photos={feed.items} view={view} />
        {feed.more && !limit && feed.items.length > 0 && (
          <div className="collection-continuation" aria-hidden="true" />
        )}
      </div>
      <FeedStatus
        feed={feed}
        paginated={!limit}
        empty="No photos in this collection yet. Please check back soon."
        label={!limit ? 'pictures' : undefined}
      />
    </>
  );
}
export function PublicGallery({
  preview = false,
  active = true,
}: {
  preview?: boolean;
  active?: boolean;
}) {
  const [category, setCategory] = useState('All');
  const [view, setView] = useState<'editorial' | 'grid'>('editorial');
  return (
    <div className={`gallery-presentation gallery-presentation--${view}`}>
      <div className="gallery-view-bar">
        <p>
          {preview
            ? 'A few frames from our world'
            : 'A collection of moments, yours to explore'}
        </p>
        <div
          className="gallery-view-switch"
          role="group"
          aria-label="Gallery layout"
        >
          <button
            type="button"
            aria-pressed={view === 'editorial'}
            onClick={() => setView('editorial')}
          >
            <span aria-hidden="true">▥</span> Editorial
          </button>
          <button
            type="button"
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
          >
            <span aria-hidden="true">▦</span> Grid
          </button>
        </div>
      </div>
      {!preview && (
        <div
          className="gallery-filters"
          role="group"
          aria-label="Photo categories"
        >
          {['All', ...categories].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {value}
            </button>
          ))}
        </div>
      )}
      <PhotoCollection
        key={category}
        category={category}
        limit={preview ? 8 : undefined}
        view={view}
        active={active}
      />
    </div>
  );
}
export function PublicTestimonials({ preview = false }: { preview?: boolean }) {
  const limit = preview ? 3 : 30;
  const feed = usePagedFeed<ContentRecord>(
    `/api/content/testimonials?limit=${limit}`,
    limit,
  );
  return (
    <>
      <div className="testimonial-grid">
        {feed.items.map((review) => (
          <article className="testimonial-card" key={review._id}>
            <header>
              <span className="review-avatar" aria-hidden="true">
                {review.sample
                  ? 'S'
                  : review.name
                      ?.trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join('')
                      .toUpperCase()}
              </span>
              <div>
                <h3>{review.name}</h3>
                {review.date ? (
                  <time dateTime={review.date}>
                    {new Intl.DateTimeFormat('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    }).format(new Date(`${review.date}T00:00:00Z`))}
                  </time>
                ) : (
                  <span>Preview content</span>
                )}
              </div>
            </header>
            <p className="testimonial-text">{review.text}</p>
            <footer>
              {review.sample
                ? 'Development sample · not a customer testimonial'
                : 'Shared with our studio'}
            </footer>
          </article>
        ))}
      </div>
      <FeedStatus
        feed={feed}
        paginated={!preview}
        empty="Client testimonials will appear here soon."
      />
    </>
  );
}
function VideoCard({
  video,
  active = true,
}: {
  video: ContentRecord;
  active?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <article className="video-card">
      <div className="video-frame">
        {playing && !failed && active ? (
          <iframe
            loading="lazy"
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?playsinline=1&rel=0`}
            title={video.title}
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onError={() => setFailed(true)}
          />
        ) : (
          <button
            type="button"
            className="video-play"
            onClick={() => {
              setPlaying(true);
              setFailed(false);
            }}
            aria-label={`Play ${video.title}`}
          >
            <YouTubeThumbnail videoId={video.videoId} />
            <span className="video-play-overlay">
              <span className="video-play-icon" aria-hidden="true">
                ▶
              </span>
              <span className="video-play-label">
                {failed ? 'Try again' : 'Play film'}
              </span>
            </span>
          </button>
        )}
      </div>
      <h3>{video.title}</h3>
      {video.sample && <p className="sample-note">Development sample film</p>}
      <p className="video-fallback">
        If playback is unavailable,{' '}
        <a
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          watch on YouTube ↗
        </a>
        .
      </p>
    </article>
  );
}
export function PublicVideos({
  preview = false,
  active = true,
}: {
  preview?: boolean;
  active?: boolean;
}) {
  const limit = preview ? 1 : 6;
  const feed = usePagedFeed<ContentRecord>(
    `/api/content/videos?limit=${limit}${preview ? '' : '&pagination=1'}`,
    limit,
    { enabled: active, refreshOnFocus: false },
  );
  return (
    <>
      <div className={`video-grid${preview ? ' video-grid--preview' : ''}`}>
        {feed.items.map((video) => (
          <VideoCard key={video._id} video={video} active={active} />
        ))}
      </div>
      <FeedStatus
        feed={feed}
        paginated={!preview}
        empty="Our films will appear here soon."
        label={!preview ? 'films' : undefined}
      />
    </>
  );
}
