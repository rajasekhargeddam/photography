# SEO launch checklist

The planned domain is `mydreamphotography.in`; ownership and deployment are not yet confirmed.

## When the domain is purchased

1. Connect the domain to the hosting provider and enable HTTPS.
2. Set `NEXT_PUBLIC_SITE_URL=https://mydreamphotography.in` and `APP_ORIGIN=https://mydreamphotography.in` in production, then rebuild. Keep localhost values for local development. These settings also affect same-origin form security.
3. Permanently redirect HTTP and the www hostname to the chosen HTTPS domain. Keep preview deployments private or configure host-level noindex headers; do not let preview URLs compete with the main domain.
4. Confirm the six public pages return HTTP 200, canonical URLs use the production domain, `/robots.txt` is accessible, and `/sitemap.xml` contains only public pages. Booking and admin pages retain noindex metadata. Robots rules do not protect confidential data; authentication does.
5. Replace any development sample portfolio content and testimonials with real, approved work before launch. Add the remaining service photos, using accurate descriptions of the image rather than repeated keywords.

## Google setup

- Add a Domain property in Google Search Console and verify ownership using the DNS TXT record Google provides. Submit `https://mydreamphotography.in/sitemap.xml` and inspect the home, services and contact URLs.
- Claim or verify the existing My Dream Photography Google Business Profile rather than creating a duplicate. Match its business name, address, phone and website with the site; confirm opening hours, photography categories and service areas. Ask actual clients for honest reviews.
- Run Google's Rich Results Test on the live homepage. Structured data uses existing studio details, without invented ratings, opening hours or prices.
- Check mobile PageSpeed Insights and Search Console Core Web Vitals once deployed. The first hero photo has eager/high-priority delivery; portfolio thumbnails remain responsive and original-quality lightbox viewing remains unchanged. Dynamic gallery and hero data currently load on the client, so measure their loading waterfall before considering server rendering/caching.
- Monitor indexing, search queries, clicks and enquiry conversions. Rankings depend on competition, relevance and reputation and are not guaranteed by metadata or Next.js.

## Maintenance

Public titles, descriptions, canonicals and sitemap routes share `src/config/seo.ts`. Studio structured data lives in `src/components/seo/studio-schema.tsx`. Update these when business facts change. Do not add fake last-modified dates, keyword lists, location doorway pages or self-awarded review ratings.

References: [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [local business structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business), [business details](https://developers.google.com/search/docs/appearance/establish-business-details).
