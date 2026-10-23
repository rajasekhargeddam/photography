import { pageMetadata } from '@/config/seo';
import { Container, Section } from '@/components/ui/layout';
import { PageIntro, EventCallout } from '@/components/ui/public-page';
import { PublicTestimonials } from '@/features/content/public-content';

export const metadata = pageMetadata('/testimonials');
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
