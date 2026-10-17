'use client';
import { useAppSelector } from '@/lib/store/hooks';
import { Container, Eyebrow } from '@/components/ui/layout';
import { ButtonLink } from '@/components/ui/button';
import { QuotePrint, SaveQuotePdf } from './quote-print';

export function BookingThankYou() {
  const reference = useAppSelector((state) => state.booking.completedReference);
  const quote = useAppSelector((state) => state.booking.completedQuote);
  return (
    <>
      {quote && <QuotePrint details={quote.details} saved={quote.saved} />}
      <section className="section booking-page">
        <Container>
          <Eyebrow>My Dream Photography</Eyebrow>
          <h1>
            {reference ? 'Your request is confirmed.' : 'Plan your event.'}
          </h1>
          <p className="booking-note">
            {reference
              ? 'Our studio will call you to discuss your event, availability and payment. Your date is not reserved yet.'
              : 'Choose your event and services to send an enquiry.'}
          </p>
          {quote && <SaveQuotePdf />}
          <ButtonLink href={reference ? '/' : '/book'}>
            {reference ? 'Back to home' : 'Plan Your Event'}
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}
