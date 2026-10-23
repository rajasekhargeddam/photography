/** Shared photographs for the Services page and existing quote choices. */
export const serviceImages = {
  preWedding: '/images/services/pre-wedding.webp',
  halfSaree: '/images/services/half-saree.webp',
  newborn: '/images/services/newborn.webp',
  kids: '/images/services/kids.webp',
} as const;

export function serviceImagePosition(src: string) {
  return src === serviceImages.preWedding ? '50% 70%' : '50% 50%';
}
