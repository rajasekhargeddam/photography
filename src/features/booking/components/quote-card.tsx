import { serviceImagePosition } from '@/data/service-images';
import Image from 'next/image';
import type { ReactNode } from 'react';
const coverageImages: Record<string, string> = {
  'traditional-photo': 'traditional-photo.png',
  'traditional-video': 'traditional-video.png',
  candid: 'candid-photo.png',
  cinematic: 'candid-video.png',
  drone: 'drone.png',
  'audience-video': 'traditional-video.png',
};

export function QuoteCard({
  title,
  description,
  price,
  image,
  service,
  icon,
  selected,
  onClick,
}: {
  title: string;
  description?: string;
  price?: string;
  image?: string | null;
  service?: string;
  icon?: ReactNode;
  selected?: boolean;
  onClick: () => void;
}) {
  const coverageImage = service ? coverageImages[service] : undefined;
  return (
    <button
      type="button"
      className="guided-card"
      aria-pressed={selected}
      onClick={onClick}
    >
      {selected !== undefined && (
        <span className="guided-tick" aria-hidden="true">
          {selected && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="m5 12 4 4L19 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      )}
      <span
        className={`guided-card-media${coverageImage ? ' guided-coverage-media' : ''}`}
      >
        {coverageImage ? (
          <Image
            src={`/images/coverage/${coverageImage}`}
            alt=""
            fill
            sizes="(max-width:600px) 80vw, 260px"
          />
        ) : image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width:600px) 80vw, 260px"
            style={{
              objectPosition: serviceImagePosition(image),
            }}
          />
        ) : image === null ? null : (
          <span className="guided-symbol" aria-hidden="true">
            {icon ?? '✦'}
          </span>
        )}
      </span>
      <strong>{title}</strong>
      {description && <span>{description}</span>}
      {price && <small>{price}</small>}
    </button>
  );
}
