import type { Metadata } from 'next';
import { site } from './site';

export const publicPages = {
  '/': {
    title: 'Wedding Photographers in Narsipatnam & Vizag',
    description:
      'My Dream Photography captures weddings and celebrations in Narsipatnam and Visakhapatnam (Vizag). Meet Raheem, explore our work and build your quote.',
  },
  '/about': {
    title: 'Meet Raheem, Founder & Lead Photographer',
    description:
      'Meet Raheem of My Dream Photography: 13 years of wedding photography and cinematic storytelling, with 500+ weddings captured.',
  },
  '/services': {
    title: 'Photography Services in Narsipatnam & Vizag',
    description:
      'Explore wedding, pre-wedding, engagement, half saree, birthday, newborn and kids photography in Narsipatnam and Visakhapatnam. Plan your shoot.',
  },
  '/portfolio': {
    title: 'Wedding & Celebration Photography Portfolio',
    description:
      'Explore photographs and cinematic films by My Dream Photography, serving Narsipatnam and Visakhapatnam (Vizag). Find inspiration for your celebration.',
  },
  '/contact': {
    title: 'Contact Our Photography Studio in Narsipatnam',
    description:
      'Contact My Dream Photography in Narsipatnam for wedding photography, films and portrait sessions across Visakhapatnam (Vizag). Call or request a callback.',
  },
  '/testimonials': {
    title: 'Client Stories & Testimonials',
    description:
      'Read client experiences with My Dream Photography and discover the stories behind the weddings, portraits and celebrations we capture.',
  },
} as const;

export function pageMetadata(path: keyof typeof publicPages): Metadata {
  const { title, description } = publicPages[path];
  const images = [
    { url: '/images/brand/my-dream-photography.png', alt: site.name },
  ];
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: site.name,
      title,
      description,
      url: path,
      images,
    },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}
