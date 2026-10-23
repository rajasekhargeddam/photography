import Link from 'next/link';
import Image from 'next/image';
export function Brand({ showLocation = true }: { showLocation?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="My Dream Photography home">
      <span className="brand-logo">
        <Image
          src="/images/brand/my-dream-photography.png"
          alt="My Dream Photography"
          width={2592}
          height={2592}
          sizes="(max-width: 700px) 240px, 320px"
          className="brand-logo-image"
        />
      </span>
      {showLocation && <small>Narsipatnam · Vizag</small>}
    </Link>
  );
}
