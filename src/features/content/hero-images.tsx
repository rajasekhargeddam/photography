'use client';
import Image from 'next/image';
import {
  isCloudinaryPhoto,
  photographyImageLoader,
} from '@/lib/image-delivery';
import { useEffect, useState } from 'react';
import { usePagedFeed } from '@/lib/use-paged-feed';
import type { ContentRecord } from './model';

export function HeroImages() {
  const feed = usePagedFeed<ContentRecord>('/api/content/hero?limit=5', 5);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const photos = feed.items.filter(
    (photo) => photo.url && !failed.includes(photo._id),
  );
  const count = photos.length;
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((value) => (value + 1) % count);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [count, paused, reduced]);
  return (
    <>
      {!count && <div className="hero-atmosphere" aria-hidden="true" />}
      {photos.map((photo, position) => (
        <Image
          key={photo._id}
          src={photo.url!}
          loader={
            isCloudinaryPhoto(photo.url!) ? photographyImageLoader : undefined
          }
          alt=""
          fill
          sizes="100vw"
          loading={position === 0 ? 'eager' : 'lazy'}
          fetchPriority={position === 0 ? 'high' : 'auto'}
          unoptimized={!isCloudinaryPhoto(photo.url!)}
          className={`hero-photo hero-slide${position === index % count ? ' is-active' : ''}`}
          onError={() => setFailed((old) => [...old, photo._id])}
        />
      ))}
      {count > 1 && (
        <div
          className="hero-slideshow-controls"
          role="group"
          aria-label="Hero photos"
        >
          {photos.map((photo, position) => (
            <button
              key={photo._id}
              type="button"
              aria-label={`Show photo ${position + 1}: ${photo.alt ?? ''}`}
              aria-pressed={position === index % count}
              onClick={() => {
                setIndex(position);
                setPaused(true);
              }}
            >
              <span aria-hidden="true">●</span>
            </button>
          ))}
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={
                paused
                  ? 'Play background slideshow'
                  : 'Pause background slideshow'
              }
            >
              {paused ? 'Play' : 'Pause'}
            </button>
          )}
        </div>
      )}
    </>
  );
}
