import { Icon } from '@/components/ui/icon';
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
        description="Visit our studio in Narsipatnam. Capturing celebrations across Visakhapatnam (Vizag) and beyond."
      />
      <Section className="public-content">
        <Container className="contact-layout">
          <div>
            <Eyebrow>Our studio</Eyebrow>
            <h2>My Dream Photography</h2>
            <address>{business.address}</address>
            <a
              className="studio-map-card"
              href={business.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open My Dream Photography in Google Maps (opens in a new tab)"
            >
              <span className="studio-map-preview">
                <iframe
                  src={business.mapEmbedUrl}
                  title="Map preview of My Dream Photography, Narsipatnam"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </span>
              <span className="studio-map-caption">
                <span>
                  <strong>Visit our studio</strong>
                  <small>Narsipatnam, Andhra Pradesh</small>
                </span>
                <span className="studio-map-action">
                  <Icon name="map-pin" /> Get directions{' '}
                  <Icon name="external" />
                </span>
              </span>
            </a>
            <div className="contact-actions">
              <a
                className="button button--primary"
                href={`tel:${business.phone}`}
              >
                <Icon name="phone" /> Call {business.phone}
              </a>
              {business.socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--text"
                >
                  <Icon
                    name={link.label === 'Instagram' ? 'instagram' : 'external'}
                  />{' '}
                  {link.label}
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
