import type { ImageLoaderProps } from 'next/image';

export function isCloudinaryPhoto(src: string) {
  try {
    const url = new URL(src);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      url.pathname.includes('/image/upload/')
    );
  } catch {
    return false;
  }
}
/** The original URL stays in storage; only delivered screen copies are transformed. */
export function photographyImageLoader({ src, width }: ImageLoaderProps) {
  if (!isCloudinaryPhoto(src)) return src;
  const url = new URL(src);
  url.pathname = url.pathname.replace(
    '/image/upload/',
    `/image/upload/f_auto,q_auto:best,c_limit,w_${Math.max(1, Math.round(width))}/`,
  );
  return url.toString();
}
export function portfolioImageSizes(view: 'editorial' | 'grid', index: number) {
  const fraction =
    view === 'grid' ? 1 / 3 : [2 / 3, 1 / 3, 1 / 3, 1 / 2, 1, 1 / 2][index % 6];
  const mobile =
    view === 'editorial' && index % 3 === 0
      ? 'calc(100vw - 2.5rem)'
      : 'calc((100vw - 3.5rem) / 2)';
  return `(max-width: 700px) ${mobile}, (min-width: 1600px) ${Math.ceil(1440 * fraction)}px, ${Math.ceil(90 * fraction)}vw`;
}
