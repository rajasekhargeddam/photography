import { uiCopy } from '@/config/copy';
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
    'Wedding photography and cinematic storytelling by Raheem and My Dream Photography. 13 years of capturing celebrations in Narsipatnam and Visakhapatnam (Vizag), Andhra Pradesh.',
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
            <span>Moments Pass.</span>
            <br />
            <em>Memories Stay.</em>
          </h1>
          <p>Weddings, pre-weddings and the moments in between.</p>
          <div className="home-actions">
            <ButtonLink href="/contact">
              {uiCopy.actions.contactStudio} <Icon name="arrow" />
            </ButtonLink>
            <ButtonLink href="/book" variant="outline">
              {uiCopy.actions.buildQuote}
            </ButtonLink>
          </div>
        </Container>
        <div className="hero-side-note" aria-hidden="true">
          A little light. A lifetime of feeling.
        </div>
        <a className="hero-scroll" href="#selected-work">
          <span>Discover our stories</span>
          <span aria-hidden="true">↓</span>
        </a>
        <div className="hero-edition" aria-hidden="true">
          01 — Moments, made timeless
        </div>
      </section>

      <Section className="studio-manifesto" aria-labelledby="manifesto-title">
        <Container>
          <div className="manifesto-index">
            <span>01 / The way we see it</span>
            <span>My Dream · A photography studio</span>
          </div>
          <Eyebrow>More than a photograph</Eyebrow>
          <h2 id="manifesto-title">
            The way it looked.
            <br />
            <em>The way it felt.</em>
          </h2>
          <div className="manifesto-bottom">
            <p>
              The grand celebrations. The almost-missed glances. The people who
              make it all mean something. A little of your world, held still.
            </p>
            <ButtonLink href="/about" variant="text">
              Discover our approach <Icon name="arrow" />
            </ButtonLink>
          </div>
          <nav className="story-index" aria-label="Explore our photography">
            <a href="/services#weddings">
              <span>01</span> Weddings <span aria-hidden="true">↗</span>
            </a>
            <a href="/services#pre-wedding">
              <span>02</span> Just the two of you{' '}
              <span aria-hidden="true">↗</span>
            </a>
            <a href="/services#celebrations">
              <span>03</span> Life’s celebrations{' '}
              <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </Container>
      </Section>

      <Section
        id="selected-work"
        className="selected-work"
        aria-labelledby="work-title"
      >
        <Container>
          <div className="home-section-top">
            <div>
              <Eyebrow>Selected work</Eyebrow>
              <SectionHeading id="work-title">
                Every picture. A feeling.
              </SectionHeading>
            </div>
            <ButtonLink href="/portfolio" variant="text">
              {uiCopy.actions.viewPortfolio} <Icon name="arrow" />
            </ButtonLink>
          </div>
          <PublicGallery preview />
        </Container>
      </Section>

      <Section className="home-studio" aria-labelledby="studio-title">
        <Container className="studio-layout">
          <div className="studio-photo depth-frame">
            <Image
              src="/images/founder/raheem-portrait.jpeg"
              alt="Raheem, founder and lead photographer of My Dream Photography"
              fill
              sizes="(max-width: 700px) 90vw, 35vw"
            />
            <span className="studio-photo-label">
              Raheem <span>Founder & Lead Photographer</span>
            </span>
          </div>
          <div>
            <Eyebrow>Meet the founder · Raheem</Eyebrow>
            <SectionHeading id="studio-title">
              Every moment.
              <br />A story worth keeping.
            </SectionHeading>
            <p>
              What started as a passion has become a journey of 13 years and
              500+ weddings. At My Dream Photography, we preserve real emotions
              through beautiful wedding photography and cinematic storytelling.
            </p>
            <ButtonLink href="/about" variant="text">
              Meet Raheem <Icon name="arrow" />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="films-title">
        <Container>
          <div className="home-section-top">
            <SectionHeading id="films-title">Stories in motion.</SectionHeading>
            <ButtonLink href="/portfolio#videos" variant="text">
              {uiCopy.actions.viewFilms} <Icon name="arrow" />
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
              {uiCopy.actions.viewTestimonials} <Icon name="arrow" />
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
              {uiCopy.actions.buildQuote} <Icon name="arrow" />
            </ButtonLink>
            <ButtonLink href="/contact" variant="text">
              {uiCopy.actions.contactStudio} <Icon name="arrow" />
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
