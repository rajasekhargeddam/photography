import type { Metadata } from 'next';
import {
  Container,
  Section,
  Eyebrow,
  SectionHeading,
} from '@/components/ui/layout';
import { PageIntro } from '@/components/ui/public-page';
import { CallbackForm } from '@/features/contact/callback-form';
import { business } from '@/config/business';
export const metadata: Metadata = {
  title: 'Contact',
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Every story starts with hello."
        description="Visit our studio in Balighattam."
      />
      <Section className="public-content">
        <Container className="contact-layout">
          <div>
            <Eyebrow>Our studio</Eyebrow>
            <h2>My Dream Photography</h2>
            <address>{business.address}</address>
            <div className="contact-actions">
              <a
                className="button button--primary"
                href={`tel:${business.phone}`}
              >
                Call {business.phone}
              </a>
              <a
                className="button button--outline"
                href={business.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions
              </a>
              {business.socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--text"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
          <div className="callback-panel">
            <Eyebrow>Your next celebration</Eyebrow>
            <SectionHeading>Tell us what you’re planning.</SectionHeading>
            <CallbackForm />
          </div>
        </Container>
      </Section>
    </>
  );
}
