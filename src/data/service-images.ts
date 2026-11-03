/** Shared photographs for the Services page and existing quote choices. */
export const serviceImages = {
  wedding: '/images/services/wedding.webp',
  engagement: '/images/services/engagement.webp',
  birthday: '/images/services/birthday.webp',
  maternity: '/images/services/maternity.webp',
  preWedding: '/images/services/pre-wedding.webp',
  halfSaree: '/images/services/half-saree.webp',
  newborn: '/images/services/newborn.webp',
  kids: '/images/services/kids.webp',
} as const;

export function serviceImagePosition(src: string) {
  if (src === serviceImages.wedding) return '50% 40%';
  if (src === serviceImages.engagement) return '50% 25%';
  if (src === serviceImages.birthday) return '50% 35%';
  if (src === serviceImages.maternity) return '50% 30%';
  return src === serviceImages.preWedding ? '50% 70%' : '50% 50%';
}
