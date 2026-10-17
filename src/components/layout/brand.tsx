import Link from 'next/link';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="My Dream Photography home">
      <span>My Dream Photography</span>
      <small>Balighattam · Andhra Pradesh</small>
    </Link>
  );
}
