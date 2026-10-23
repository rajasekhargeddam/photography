import { serviceImagePosition } from '@/data/service-images';
import { pageMetadata } from '@/config/seo';
import Image from 'next/image';
import {
  Container,
  Section,
  Eyebrow,
  SectionHeading,
} from '@/components/ui/layout';
import { ButtonLink } from '@/components/ui/button';
import { services } from '@/data/catalog';
import { Icon } from '@/components/ui/icon';
import '@/styles/services.css';

export const metadata = pageMetadata('/services');

export default function Page() {
  return (
    <div className="services-editorial">
      <Section className="services-intro">
        <Container>
          <Eyebrow>Our Services</Eyebrow>
          <h1>
            Capturing emotions.
            <br />
            <em>Creating timeless memories.</em>
          </h1>
          <div className="services-intro-bottom">
            <p>
              At My Dream Photography, we turn your most precious moments into
              beautiful memories through creative photography and cinematic
              storytelling in Narsipatnam and Visakhapatnam (Vizag).
            </p>
            <span className="services-intro-note">
              Seven ways to tell your story.
            </span>
          </div>
        </Container>
      </Section>
      <Section
        className="services-collection"
        aria-label="Photography services"
      >
        <Container className="services-sequence">
          {services.map((service) => (
            <article
              id={service.id}
              className="services-entry"
              key={service.id}
              aria-labelledby={`service-${service.id}`}
            >
              <div className="services-photo-space">
                {service.image ? (
                  <Image
                    src={service.image}
                    alt={`${service.name} photography by My Dream Photography`}
                    fill
                    sizes="(max-width: 700px) 90vw, 500px"
                    style={{
                      objectPosition: serviceImagePosition(service.image),
                    }}
                  />
                ) : (
                  <div
                    className="services-photo-placeholder"
                    role="img"
                    aria-label={`${service.name} photo coming soon`}
                  >
                    <span
                      className="services-frame-corner"
                      aria-hidden="true"
                    />
                    <span className="services-photo-title" aria-hidden="true">
                      {service.name}
                    </span>
                    <span className="services-photo-caption" aria-hidden="true">
                      A glimpse of the story · Coming soon
                    </span>
                  </div>
                )}
              </div>
              <div className="services-entry-copy">
                <h2 id={`service-${service.id}`}>{service.name}</h2>
                <p className="services-tagline">{service.tagline}</p>
                <p className="services-description">{service.description}</p>
                <ButtonLink href="/contact" variant="text">
                  Let’s plan your shoot <Icon name="arrow" />
                </ButtonLink>
              </div>
            </article>
          ))}
        </Container>
      </Section>
      <Section
        className="services-invitation"
        aria-labelledby="services-invitation-title"
      >
        <Container>
          <Eyebrow>Your next beautiful memory</Eyebrow>
          <SectionHeading id="services-invitation-title">
            Let’s create beautiful
            <br />
            <em>memories together.</em>
          </SectionHeading>
          <p>Every celebration deserves to be remembered.</p>
          <div className="services-invitation-actions">
            <ButtonLink href="/contact">
              Book Your Shoot <Icon name="arrow" />
            </ButtonLink>
            <ButtonLink href="/book" variant="outline">
              Get a Quote
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </div>
  );
}
