import type { Metadata } from 'next';
import Image from 'next/image';
import {
  Container,
  Section,
  Eyebrow,
  SectionHeading,
} from '@/components/ui/layout';
import { PageIntro } from '@/components/ui/public-page';
import { ButtonLink } from '@/components/ui/button';
import '@/styles/about.css';

export const metadata: Metadata = {
  title: 'Meet Raheem | Our Story',
  description:
    'Meet Raheem, founder and lead photographer of My Dream Photography. 13 years of wedding photography and cinematic storytelling in Narsipatnam and Visakhapatnam (Vizag), Andhra Pradesh.',
  robots: { index: false, follow: true },
};

const milestones = [
  {
    value: '500+',
    label: 'Weddings Captured',
    description: 'Beautiful celebrations, unforgettable memories.',
  },
  {
    value: '13',
    label: 'Years of Experience',
    description: 'A journey built on passion, creativity, and dedication.',
  },
  {
    value: '98%',
    label: 'Referral Rate',
    description: 'The trust of our clients is our greatest achievement.',
  },
];

export default function Page() {
  return (
    <>
      <PageIntro
        eyebrow="The person behind the stories"
        title="Hi, I’m Raheem."
        description="Founder & Lead Photographer | My Dream Photography"
      />
      <Section className="public-story" aria-labelledby="founder-story-title">
        <Container className="public-split">
          <div className="founder-photo">
            <Image
              src="/images/founder/raheem-portrait.jpeg"
              alt="Raheem, founder of My Dream Photography, smiling behind his camera"
              fill
              sizes="(max-width: 700px) 90vw, 45vw"
            />
          </div>
          <div>
            <Eyebrow>Every moment has a story</Eyebrow>
            <SectionHeading id="founder-story-title">
              I believe it deserves to be remembered beautifully.
            </SectionHeading>
            <p>
              What started as a passion for photography has grown into a journey
              of 13 years, capturing love, emotions, traditions, and
              unforgettable celebrations.
            </p>
            <p>
              At My Dream Photography, we don’t just take photographs. We
              preserve real emotions and create timeless memories through
              beautiful wedding photography and cinematic storytelling.
            </p>
            <p>
              Every wedding is personal to us, and every story deserves our
              best.
            </p>
          </div>
        </Container>
      </Section>
      <Section aria-labelledby="journey-title">
        <Container>
          <Eyebrow>Passion, experience, trust</Eyebrow>
          <SectionHeading id="journey-title">
            Our Journey in Numbers
          </SectionHeading>
          <dl className="founder-milestones">
            {milestones.map((milestone) => (
              <div key={milestone.label}>
                <dt>{milestone.label}</dt>
                <dd className="milestone-value">{milestone.value}</dd>
                <dd className="milestone-description">
                  {milestone.description}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>
      <Section className="public-story" aria-labelledby="philosophy-title">
        <Container className="public-split">
          <div>
            <Eyebrow>Our Philosophy</Eyebrow>
            <SectionHeading id="philosophy-title">
              We Don’t Just Capture Weddings. We Preserve How They Felt.
            </SectionHeading>
            <p>
              From the smallest emotional moments to the grandest celebrations,
              our mission is to tell every love story naturally, creatively, and
              beautifully.
            </p>
          </div>
          <div className="founder-photo">
            <Image
              src="/images/founder/raheem-at-work.jpeg"
              alt="Raheem photographing a celebration with his camera"
              fill
              sizes="(max-width: 700px) 90vw, 45vw"
            />
          </div>
        </Container>
      </Section>
      <Section
        className="founder-callout"
        aria-labelledby="founder-contact-title"
      >
        <Container>
          <Eyebrow>Let’s Create Your Story.</Eyebrow>
          <SectionHeading id="founder-contact-title">
            Your Story, Beautifully Told.
          </SectionHeading>
          <div className="founder-actions">
            <ButtonLink href="/contact">Get in Touch</ButtonLink>
            <ButtonLink href="/portfolio" variant="outline">
              View Our Work
            </ButtonLink>
          </div>
          <p>
            My Dream Photography
            <br />
            Narsipatnam | Visakhapatnam (Vizag), Andhra Pradesh
          </p>
        </Container>
      </Section>
    </>
  );
}
