'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './youtube-thumbnail.module.css';

const resolutions = ['maxresdefault', 'hqdefault', 'mqdefault'] as const;

function Thumbnail({ videoId, alt }: { videoId: string; alt: string }) {
  const [resolution, setResolution] = useState(0);
  const unavailable =
    !/^[\w-]{11}$/.test(videoId) || resolution >= resolutions.length;
  const next = () =>
    setResolution((current) => Math.min(current + 1, resolutions.length));
  return (
    <span className={styles.thumbnail}>
      {unavailable ? (
        <span className={styles.fallback}>Thumbnail unavailable</span>
      ) : (
        <Image
          key={resolution}
          src={`https://i.ytimg.com/vi/${videoId}/${resolutions[resolution]}.jpg`}
          alt={alt}
          fill
          sizes="(max-width: 700px) 90vw, 50vw"
          unoptimized
          referrerPolicy="no-referrer"
          className={styles.image}
          onError={next}
          onLoad={(event) => {
            // YouTube can return a tiny placeholder for an unavailable size.
            if (event.currentTarget.naturalWidth <= 120) next();
          }}
        />
      )}
    </span>
  );
}

/** Resets the fallback sequence whenever a film's YouTube ID changes. */
export function YouTubeThumbnail({
  videoId = '',
  alt = '',
}: {
  videoId?: string;
  alt?: string;
}) {
  return <Thumbnail key={videoId} videoId={videoId} alt={alt} />;
}
