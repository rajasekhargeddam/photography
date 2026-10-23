import { business } from '@/config/business';
import { site } from '@/config/site';
import { services } from '@/data/catalog';

export function StudioSchema() {
  const url = new URL('/', site.url).href;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${url}#studio`,
        name: business.name,
        url,
        description: site.description,
        telephone: '+919949104963',
        image: new URL('/images/founder/raheem-portrait.jpeg', url).href,
        logo: new URL('/images/brand/my-dream-photography.png', url).href,
        address: {
          '@type': 'PostalAddress',
          streetAddress:
            'Opp. Style Union, South India Shopping Mall, Beside Trendz',
          addressLocality: 'Narsipatnam',
          addressRegion: 'Andhra Pradesh',
          postalCode: '531116',
          addressCountry: 'IN',
        },
        hasMap: business.mapUrl,
        areaServed: ['Narsipatnam', 'Visakhapatnam (Vizag)'],
        sameAs: business.socialLinks.map((link) => link.url),
        founder: {
          '@type': 'Person',
          name: 'Raheem',
          jobTitle: 'Founder & Lead Photographer',
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Photography services',
          itemListElement: services.map((service) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: `${service.name} photography`,
              description: service.description,
              url: new URL(`/services#${service.id}`, url).href,
            },
          })),
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        url,
        name: site.name,
        publisher: { '@id': `${url}#studio` },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
