import { uiCopy } from '@/config/copy';
import { Container, Eyebrow, Section } from './layout';
import { ButtonLink } from './button';
import { Icon } from './icon';
export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <Section className="public-intro">
      <Container>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </Container>
    </Section>
  );
}
export function EventCallout() {
  return (
    <Section className="event-callout">
      <Container>
        <h2>Make your next memory.</h2>
        <ButtonLink href="/book">
          {uiCopy.actions.buildQuote} <Icon name="arrow" />
        </ButtonLink>
      </Container>
    </Section>
  );
}
