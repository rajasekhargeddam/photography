'use client';
import Image from 'next/image';
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
      <Image
        src="/images/home/stitch-7.jpg"
        alt=""
        fill
        sizes="100vw"
        preload
        className="hero-photo"
      />
      {photos.map((photo, position) => (
        <Image
          key={photo._id}
          src={
            photo.url!.startsWith('https://res.cloudinary.com/')
              ? photo.url!.replace(
                  '/image/upload/',
                  '/image/upload/f_auto,q_auto,c_limit,w_1920/',
                )
              : photo.url!
          }
          alt=""
          fill
          sizes="100vw"
          unoptimized
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
