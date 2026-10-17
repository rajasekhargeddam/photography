import type { Metadata } from 'next';
import { Container, Section } from '@/components/ui/layout';
import {
  PageIntro,
  PublicPhoto,
  EventCallout,
} from '@/components/ui/public-page';
import { ButtonLink } from '@/components/ui/button';
import { services } from '@/data/catalog';
import { Icon } from '@/components/ui/icon';
export const metadata: Metadata = {
  title: 'Services',
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <>
      <PageIntro
        eyebrow="What we capture"
        title="Life gives you the moments."
        description="We help you keep them."
      />
      <Section className="public-content">
        <Container>
          <div className="services-grid">
            {services.map((service) => (
              <article
                key={service.id}
                id={service.id}
                className="service-card"
              >
                {service.image !== null ? (
                  <PublicPhoto
                    image={service.image}
                    alt={service.name + ' sample photography'}
                  />
                ) : (
                  <div className="commercial-art" aria-hidden="true">
                    <span>
                      YOUR
                      <br />
                      NEXT
                      <br />
                      CHAPTER.
                    </span>
                  </div>
                )}
                <div className="service-card-copy">
                  <h2>{service.name}</h2>
                  <p>{service.description}</p>
                  <ButtonLink href="/book" variant="text">
                    Plan Your Event <Icon name="arrow" />
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
          <p className="sample-note">
            Sample photography and service presentation for V1.
          </p>
        </Container>
      </Section>
      <EventCallout />
    </>
  );
}
