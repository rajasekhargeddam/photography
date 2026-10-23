'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  isCloudinaryPhoto,
  photographyImageLoader,
  portfolioImageSizes,
} from '@/lib/image-delivery';
import { Icon } from '@/components/ui/icon';
import type { ContentRecord } from '@/features/content/model';

function Photo({
  photo,
  large = false,
  sizes,
}: {
  photo: ContentRecord;
  large?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!photo.url || failed)
    return (
      <span className="photo-unavailable">Photo unavailable: {photo.alt}</span>
    );
  const cloudinary = isCloudinaryPhoto(photo.url);
  return (
    <span className="gallery-photo-frame">
      <Image
        src={photo.url}
        alt={photo.alt ?? ''}
        width={photo.width ?? 512}
        height={photo.height ?? 286}
        loader={!large && cloudinary ? photographyImageLoader : undefined}
        unoptimized={large || !cloudinary}
        sizes={large ? undefined : sizes}
        loading={large ? 'eager' : 'lazy'}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      {large && !loaded && (
        <span className="photo-loading" role="status">
          Loading original photo…
        </span>
      )}
    </span>
  );
}
export function GalleryLightbox({
  photos,
  view = 'editorial',
}: {
  photos: ContentRecord[];
  view?: 'editorial' | 'grid';
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [viewer, setViewer] = useState<{
    photos: ContentRecord[];
    index: number;
  } | null>(null);
  const open = viewer !== null;
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  const move = (amount: number) =>
    setViewer((current) =>
      current
        ? {
            ...current,
            index:
              (current.index + amount + current.photos.length) %
              current.photos.length,
          }
        : null,
    );
  return (
    <>
      <div className="gallery-collection">
        {photos.map((photo, index) => (
          <figure className="gallery-item" key={photo._id}>
            <button
              className="gallery-tile"
              type="button"
              aria-label={`Open photo ${index + 1}: ${photo.alt ?? 'Photo'}${photo.sample ? ' (sample)' : ''}`}
              onClick={() => {
                setViewer({ photos, index });
                dialog.current?.showModal();
              }}
            >
              <Photo photo={photo} sizes={portfolioImageSizes(view, index)} />
              <span className="gallery-photo-caption" aria-hidden="true">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>{photo.alt ?? 'A moment to remember'}</span>
                <span className="gallery-open">↗</span>
              </span>
            </button>
            <figcaption className="photo-credit">
              <span>{photo.category ?? 'Selected work'}</span>
              <span>{String(index + 1).padStart(2, '0')}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="gallery-dialog"
        aria-label="Photo viewer"
        onClose={() => setViewer(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            move(event.key === 'ArrowRight' ? 1 : -1);
          }
        }}
      >
        <div className="lightbox-content">
          <div className="lightbox-toolbar">
            <p aria-live="polite">
              {viewer ? `${viewer.index + 1} / ${viewer.photos.length}` : ''}
            </p>
            <button
              className="icon-button"
              aria-label="Close photo viewer"
              type="button"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" />
            </button>
          </div>
          {viewer && (
            <div
              className="lightbox-photo"
              onTouchStart={(event) => {
                if (event.touches.length !== 1) {
                  touchStart.current = null;
                  return;
                }
                const touch = event.touches[0];
                touchStart.current = { x: touch.clientX, y: touch.clientY };
              }}
              onTouchEnd={(event) => {
                const start = touchStart.current;
                touchStart.current = null;
                if (!start || event.touches.length) return;
                const touch = event.changedTouches[0];
                const dx = touch.clientX - start.x;
                const dy = touch.clientY - start.y;
                if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
                  move(dx < 0 ? 1 : -1);
              }}
            >
              <Photo
                key={viewer.photos[viewer.index]._id}
                photo={viewer.photos[viewer.index]}
                large
              />
            </div>
          )}
          <div className="lightbox-controls">
            <button
              className="button button--outline"
              type="button"
              onClick={() => move(-1)}
              disabled={!viewer || viewer.photos.length < 2}
            >
              Previous
            </button>
            <button
              className="button button--outline"
              type="button"
              onClick={() => move(1)}
              disabled={!viewer || viewer.photos.length < 2}
            >
              Next
            </button>
          </div>
          {viewer && (
            <p className="lightbox-caption" aria-live="polite">
              {viewer.photos[viewer.index].alt}
              {viewer.photos[viewer.index].sample ? ' · Sample photograph' : ''}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
