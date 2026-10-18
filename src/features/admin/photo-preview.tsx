'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ContentRecord } from '../content/model';
import {
  isCloudinaryPhoto,
  photographyImageLoader,
} from '@/lib/image-delivery';

export function AdminPhotoPreview({
  photos,
  initialIndex,
  onClose,
}: {
  photos: ContentRecord[];
  initialIndex: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const [failed, setFailed] = useState(false);
  const photo = photos[index];
  const move = (amount: number) => {
    setFailed(false);
    setIndex((current) => (current + amount + photos.length) % photos.length);
  };
  useEffect(() => {
    const element = dialog.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  const cloudinary = isCloudinaryPhoto(photo.url ?? '');
  return (
    <dialog
      className="admin-photo-dialog"
      ref={dialog}
      aria-label="Photo preview"
      onClose={() => {
        if (!dialog.current?.open) onClose();
      }}
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
      <div className="admin-preview-toolbar">
        <p aria-live="polite">
          {index + 1} / {photos.length} · {photo.category ?? 'Photo'}
        </p>
        <button type="button" onClick={() => dialog.current?.close()}>
          Close preview
        </button>
      </div>
      <div className="admin-preview-image">
        {failed ? (
          <p role="status">This photo could not be loaded.</p>
        ) : (
          <Image
            key={photo._id}
            src={photo.url!}
            alt={photo.alt ?? 'Studio photo'}
            width={photo.width ?? 1600}
            height={photo.height ?? 1000}
            sizes="(min-width: 1600px) 1440px, 94vw"
            loader={cloudinary ? photographyImageLoader : undefined}
            unoptimized={!cloudinary}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="admin-preview-toolbar">
        <button
          type="button"
          disabled={photos.length < 2}
          onClick={() => move(-1)}
        >
          Previous
        </button>
        <p>{photo.alt}</p>
        <button
          type="button"
          disabled={photos.length < 2}
          onClick={() => move(1)}
        >
          Next
        </button>
      </div>
    </dialog>
  );
}
