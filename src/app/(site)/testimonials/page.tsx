import type { Metadata } from 'next';
import { Container, Section } from '@/components/ui/layout';
import { PageIntro, EventCallout } from '@/components/ui/public-page';
import { PublicTestimonials } from '@/features/content/public-content';

export const metadata: Metadata = {
  title: 'Testimonials',
  robots: { index: false, follow: true },
};
export default function TestimonialsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Testimonials"
        title="Experiences shared with us."
        description="Stories and feedback from the people in front of our lens."
      />
      <Section className="public-content">
        <Container>
          <PublicTestimonials />
        </Container>
      </Section>
      <EventCallout />
    </>
  );
}
