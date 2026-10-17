import type { Metadata } from 'next';
import { BookingThankYou } from '@/features/booking/components/booking-thank-you';

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false, follow: true },
};

export default function Page() {
  return <BookingThankYou />;
}
