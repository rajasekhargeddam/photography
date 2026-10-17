import type { Metadata } from 'next';
import { Container, Section } from '@/components/ui/layout';
import { PageIntro, EventCallout } from '@/components/ui/public-page';
import { PublicGallery, PublicVideos } from '@/features/content/public-content';
export const metadata: Metadata = {
  title: 'Portfolio',
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <>
      <div className="gallery-intro">
        <PageIntro eyebrow="Selected work" title="Portfolio" />
      </div>
      <Section className="public-content">
        <Container>
          <PublicGallery />
        </Container>
      </Section>
      <Section id="videos" aria-labelledby="videos-title">
        <Container>
          <div className="home-section-top">
            <h2 id="videos-title" className="section-heading">
              Videos
            </h2>
            <p>Celebrations, in motion.</p>
          </div>
          <PublicVideos />
        </Container>
      </Section>
      <EventCallout />
    </>
  );
}
