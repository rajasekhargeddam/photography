'use client';
import { useState } from 'react';
import { categories, type ContentRecord } from './model';
import { usePagedFeed } from '@/lib/use-paged-feed';
import { GalleryLightbox } from '@/features/gallery/components/gallery-lightbox';

function FeedStatus({
  feed,
  empty,
  paginated = true,
}: {
  feed: ReturnType<typeof usePagedFeed<ContentRecord>>;
  empty: string;
  paginated?: boolean;
}) {
  return (
    <div className="feed-status">
      {feed.error && (
        <div role="alert">
          <p>{feed.error}</p>
          <button
            className="button button--outline"
            onClick={() => void feed.reload()}
            disabled={feed.loading}
          >
            Try again
          </button>
        </div>
      )}
      {feed.loading && <p role="status">Loading…</p>}
      {!feed.loading && !feed.error && !feed.items.length && <p>{empty}</p>}
      {!feed.error && feed.more && paginated && (
        <button
          className="button button--outline"
          disabled={feed.loading}
          onClick={() => void feed.loadMore()}
        >
          Load more
        </button>
      )}
    </div>
  );
}
function PhotoCollection({
  category,
  limit,
}: {
  category: string;
  limit?: number;
}) {
  const params = new URLSearchParams({ limit: String(limit ?? 30) });
  if (category !== 'All') params.set('category', category);
  const feed = usePagedFeed<ContentRecord>(
    `/api/content/gallery?${params}`,
    limit ?? 30,
  );
  return (
    <>
      <p className="collection-count" role="status">
        {!feed.loading && !feed.error
          ? `${feed.items.length} ${category === 'All' ? '' : `${category} `}photos${feed.more && !limit ? ' loaded' : ''}`
          : ''}
      </p>
      {feed.items.some((photo) => photo.sample) && (
        <p className="collection-count">Includes sample photography.</p>
      )}
      <GalleryLightbox photos={feed.items} />
      <FeedStatus
        feed={feed}
        paginated={!limit}
        empty="No photos in this collection yet. Please check back soon."
      />
    </>
  );
}
export function PublicGallery({ preview = false }: { preview?: boolean }) {
  const [category, setCategory] = useState('All');
  return (
    <div>
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
function VideoCard({ video }: { video: ContentRecord }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <article className="video-card">
      <div className="video-frame">
        {playing && !failed ? (
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
            <span aria-hidden="true">▶</span>
            <span>{failed ? 'Try playing again' : 'Play film'}</span>
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
export function PublicVideos({ preview = false }: { preview?: boolean }) {
  const limit = preview ? 1 : 30;
  const feed = usePagedFeed<ContentRecord>(
    `/api/content/videos?limit=${limit}`,
    limit,
  );
  return (
    <>
      <div className={`video-grid${preview ? ' video-grid--preview' : ''}`}>
        {feed.items.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
      <FeedStatus
        feed={feed}
        paginated={!preview}
        empty="Our films will appear here soon."
      />
    </>
  );
}
