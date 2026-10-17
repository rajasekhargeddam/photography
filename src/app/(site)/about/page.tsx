import type { Metadata } from 'next';
import {
  Container,
  Section,
  Eyebrow,
  SectionHeading,
} from '@/components/ui/layout';
import {
  PageIntro,
  PublicPhoto,
  EventCallout,
} from '@/components/ui/public-page';
import { ButtonLink } from '@/components/ui/button';
export const metadata: Metadata = {
  title: 'About',
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <>
      <PageIntro
        eyebrow="Our studio"
        title="People first. Pictures forever."
        description="My Dream Photography · Balighattam, Andhra Pradesh"
      />
      <Section className="public-story">
        <Container className="public-split">
          <PublicPhoto
            image={6}
            alt="Sample portrait of a photographer at work"
          />
          <div>
            <Eyebrow>Behind the camera</Eyebrow>
            <SectionHeading>Space to be yourself.</SectionHeading>
            <p>
              Photographs of your people, your celebrations and the moments that
              feel like you.
            </p>
            <p>Explore our work and tell us what you have in mind.</p>
            <ButtonLink href="/portfolio" variant="outline">
              Explore Our Work
            </ButtonLink>
          </div>
        </Container>
      </Section>
      <Section>
        <Container>
          <PublicPhoto
            image={0}
            alt="Sample wedding portrait in the countryside"
            className="public-panorama"
          />
          <p className="sample-note">Sample imagery for the V1 preview.</p>
        </Container>
      </Section>
      <EventCallout />
    </>
  );
}
