import { serviceImages } from './service-images';
export type StudioService = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: string | null;
};

export const services: StudioService[] = [
  {
    id: 'weddings',
    name: 'Wedding',
    tagline: 'Every promise. Every feeling.',
    description:
      'From the quiet anticipation to the grand celebration, we preserve every emotion, tradition, and beautiful moment through timeless photography and cinematic films.',
    image: null,
  },
  {
    id: 'pre-wedding',
    name: 'Pre-Wedding',
    tagline: 'Your love, before the big day.',
    description:
      'A little adventure, a beautiful location, and the two of you. Romantic, natural portraits and cinematic storytelling that celebrate your connection.',
    image: serviceImages.preWedding,
  },
  {
    id: 'engagements',
    name: 'Engagement',
    tagline: 'The beginning of forever.',
    description:
      'The happy nerves, the exchanged rings, the people cheering you on. We capture the love and joy of this unforgettable beginning.',
    image: null,
  },
  {
    id: 'half-saree',
    name: 'Half Saree',
    tagline: 'A tradition. A new chapter.',
    description:
      'Elegant portraits and heartfelt event coverage that honour beautiful traditions, family bonds, and a milestone to remember.',
    image: serviceImages.halfSaree,
  },
  {
    id: 'celebrations',
    name: 'Birthday',
    tagline: 'Another year. A thousand smiles.',
    description:
      'From first birthdays to milestone celebrations, we capture every smile, surprise, and joyful moment in photographs and cinematic highlights.',
    image: null,
  },
  {
    id: 'newborn',
    name: 'Newborn',
    tagline: 'Little details. Endless love.',
    description:
      'Tiny fingers, sleepy smiles, and your first moments together. Gentle, heartwarming photography to remember how this beautiful chapter began.',
    image: serviceImages.newborn,
  },
  {
    id: 'kids-shoots',
    name: 'Kids Shoots',
    tagline: 'Big personalities. Little adventures.',
    description:
      'Playful themes, imaginative setups, and room to be themselves. We turn curious looks, joyful expressions, and everyday magic into lasting memories.',
    image: serviceImages.kids,
  },
];

// All rates and eligibility remain development samples, not studio-approved offers.
export const catalogueNotice =
  'Development sample rates. Services, inclusions and final pricing require studio confirmation. Travel, tax and delivery are not calculated.';
export const bookableServices = [
  { id: 'traditional-photo', name: 'Traditional photography', price: 10000 },
  { id: 'traditional-video', name: 'Traditional video', price: 12000 },
  { id: 'candid', name: 'Candid photography', price: 15000 },
  { id: 'cinematic', name: 'Candid video', price: 25000 },
  { id: 'drone', name: 'Drone coverage', price: 8000 },
  { id: 'audience-video', name: 'Audience video', price: 12000 },
] as const;

export const albumOptions = {
  '12x36': { id: 'album', name: 'Photo album', price: 10000 },
  '14x40': { id: 'album-large', name: 'Photo album', price: 14000 },
} as const;
