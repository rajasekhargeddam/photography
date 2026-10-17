import '@/styles/booking.css';
import '@/styles/guided-quote.css';
import '@/styles/quote-print.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BookingProviders } from '@/components/providers/booking-providers';

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function BookingLayout({ children }: { children: ReactNode }) {
  return <BookingProviders>{children}</BookingProviders>;
}
