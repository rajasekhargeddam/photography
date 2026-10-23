import { pageMetadata } from '@/config/seo';
import { Container, Section } from '@/components/ui/layout';
import { PageIntro, EventCallout } from '@/components/ui/public-page';
import { PortfolioBrowser } from '@/features/content/portfolio-browser';
export const metadata = pageMetadata('/portfolio');
export default function Page() {
  return (
    <>
      <div className="gallery-intro">
        <PageIntro
          eyebrow="Selected work"
          title="Portfolio"
          description="Wedding photography, portraits and cinematic stories by My Dream Photography, serving Narsipatnam and Visakhapatnam (Vizag)."
        />
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
