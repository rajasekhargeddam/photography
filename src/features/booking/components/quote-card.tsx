import Image from 'next/image';
import type { ReactNode } from 'react';
export function QuoteCard({
  title,
  description,
  price,
  image,
  icon,
  selected,
  onClick,
}: {
  title: string;
  description?: string;
  price?: string;
  image?: number;
  icon?: ReactNode;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="guided-card"
      aria-pressed={selected}
      onClick={onClick}
    >
      {selected !== undefined && (
        <span className="guided-tick" aria-hidden="true">
          {selected ? '✓' : ''}
        </span>
      )}
      <span className="guided-card-media">
        {image !== undefined ? (
          <Image
            src={`/images/home/stitch-${image}.jpg`}
            alt=""
            fill
            sizes="(max-width:600px) 80vw, 260px"
          />
        ) : (
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
export function ServiceDrawing({ service }: { service: string }) {
  return (
    <svg
      viewBox="0 0 120 90"
      width="120"
      height="90"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      {service === 'drone' ? (
        <>
          <path d="M40 33 22 17m58 16 18-16M40 57 22 73m58-16 18 16" />
          <ellipse cx="20" cy="15" rx="16" ry="7" />
          <ellipse cx="100" cy="15" rx="16" ry="7" />
          <ellipse cx="20" cy="75" rx="16" ry="7" />
          <ellipse cx="100" cy="75" rx="16" ry="7" />
          <rect x="39" y="30" width="42" height="30" rx="12" />
          <circle cx="60" cy="45" r="7" />
        </>
      ) : service === 'outdoor' ? (
        <>
          <circle cx="86" cy="20" r="12" />
          <path d="m10 75 32-45 25 31 14-20 29 34ZM36 39l6 8 6-8" />
        </>
      ) : (
        <>
          <path d="m23 28 9-13h34l10 13" />
          <rect x="10" y="28" width="83" height="52" rx="9" />
          <circle cx="51" cy="54" r="18" />
          <circle cx="51" cy="54" r="9" />
          <path
            d={
              ['cinematic', 'traditional-video', 'audience-video'].includes(
                service,
              )
                ? 'm94 42 19-9v40L94 63'
                : 'M74 39h10'
            }
          />
        </>
      )}
    </svg>
  );
}
