import { permanentRedirect } from 'next/navigation';

// Keep old bookmarks useful; there are no package offerings.
export default function RetiredPackagesPage() {
  permanentRedirect('/book');
}
