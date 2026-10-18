import type { Metadata } from 'next';
import { Container, Section } from '@/components/ui/layout';
import { PageIntro, EventCallout } from '@/components/ui/public-page';
import { PortfolioBrowser } from '@/features/content/portfolio-browser';
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
          <PortfolioBrowser />
        </Container>
      </Section>
      <EventCallout />
    </>
  );
}
