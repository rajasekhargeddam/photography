'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import type { ContentRecord } from '@/features/content/model';

function Photo({
  photo,
  large = false,
}: {
  photo: ContentRecord;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!photo.url || failed)
    return (
      <span className="photo-unavailable">Photo unavailable: {photo.alt}</span>
    );
  const src = photo.url.startsWith('https://res.cloudinary.com/')
    ? photo.url.replace(
        '/image/upload/',
        `/image/upload/f_auto,q_auto,c_limit,w_${large ? 1800 : 800}/`,
      )
    : photo.url;
  return (
    <Image
      src={src}
      alt={photo.alt ?? ''}
      width={photo.width ?? 512}
      height={photo.height ?? 286}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
export function GalleryLightbox({ photos }: { photos: ContentRecord[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
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
              <Photo photo={photo} />
            </button>
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
            <div className="lightbox-photo">
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
        </div>
      </dialog>
    </>
  );
}
