import Link from 'next/link';
export function Brand({ showLocation = true }: { showLocation?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="My Dream Photography home">
      <span>My Dream Photography</span>
      {showLocation && <small>Narsipatnam · Vizag</small>}
    </Link>
  );
}
