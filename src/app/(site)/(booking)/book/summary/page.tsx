import type { Metadata } from 'next';
import { BookingSummary } from '@/features/booking/components/booking-summary';
export const metadata: Metadata = { title: 'Booking summary' };
export default function Page() {
  return <BookingSummary />;
}
