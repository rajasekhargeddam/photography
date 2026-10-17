import { HeroImages } from '@/features/content/hero-images';
import type { Metadata } from 'next';
import Image from 'next/image';
import { ButtonLink } from '@/components/ui/button';
import {
  Container,
  Section,
  SectionHeading,
  Eyebrow,
} from '@/components/ui/layout';
import { Icon } from '@/components/ui/icon';
import { business } from '@/config/business';
import '@/styles/home.css';
import {
  PublicGallery,
  PublicTestimonials,
  PublicVideos,
} from '@/features/content/public-content';

export const metadata: Metadata = {
  title: 'Wedding & Celebration Photography',
  description:
    'Explore wedding, pre-wedding and celebration photography from My Dream Photography in Balighattam, Andhra Pradesh.',
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <HeroImages />
        <Container className="hero-content">
          <Eyebrow>My Dream Photography</Eyebrow>
          <h1 id="home-title">
            Moments Pass.
            <br />
            Memories Stay.
          </h1>
          <p>Weddings, pre-weddings and the moments in between.</p>
          <div className="home-actions">
            <ButtonLink href="/contact">
              BOOK YOUR DATE <Icon name="arrow" />
            </ButtonLink>
            <ButtonLink href="/book" variant="outline">
              BUILD YOUR QUOTE
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Section id="selected-work" aria-labelledby="work-title">
        <Container>
          <div className="home-section-top">
            <div>
              <Eyebrow>Selected work</Eyebrow>
              <SectionHeading id="work-title">
                Every picture. A feeling.
              </SectionHeading>
            </div>
            <ButtonLink href="/portfolio" variant="text">
              View Portfolio <Icon name="arrow" />
            </ButtonLink>
          </div>
          <PublicGallery preview />
        </Container>
      </Section>

      <Section className="home-studio" aria-labelledby="studio-title">
        <Container className="studio-layout">
          <div className="studio-photo">
            <Image
              src="/images/home/stitch-6.jpg"
              alt="Sample image of a photographer working with a camera"
              fill
              sizes="(max-width: 700px) 90vw, 35vw"
            />
          </div>
          <div>
            <Eyebrow>Our studio · Balighattam</Eyebrow>
            <SectionHeading id="studio-title">
              Your people.
              <br />
              Your story.
            </SectionHeading>
            <p>
              From quiet glances to joyful celebrations. Photography that brings
              you back to the moment.
            </p>
            <ButtonLink href="/about" variant="text">
              Meet the Studio <Icon name="arrow" />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="films-title">
        <Container>
          <div className="home-section-top">
            <SectionHeading id="films-title">Stories in motion.</SectionHeading>
            <ButtonLink href="/portfolio#videos" variant="text">
              Explore films <Icon name="arrow" />
            </ButtonLink>
          </div>
          <PublicVideos preview />
        </Container>
      </Section>

      <Section
        className="home-testimonials"
        aria-labelledby="testimonials-title"
      >
        <Container>
          <div className="home-section-top">
            <div>
              <Eyebrow>Testimonials</Eyebrow>
              <SectionHeading id="testimonials-title">
                Experiences shared with us.
              </SectionHeading>
            </div>
            <ButtonLink href="/testimonials" variant="text">
              All Testimonials <Icon name="arrow" />
            </ButtonLink>
          </div>
          <PublicTestimonials preview />
        </Container>
      </Section>

      <Section aria-labelledby="visit-title">
        <Container className="visit-layout">
          <div>
            <Eyebrow>Find us</Eyebrow>
            <SectionHeading id="visit-title">
              Let’s make memories.
            </SectionHeading>
            <p className="visit-address">{business.address}</p>
          </div>
          <div className="visit-actions">
            <ButtonLink href="/book">
              Plan Your Event <Icon name="arrow" />
            </ButtonLink>
            <ButtonLink href="/contact" variant="text">
              Visit Our Studio <Icon name="arrow" />
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
