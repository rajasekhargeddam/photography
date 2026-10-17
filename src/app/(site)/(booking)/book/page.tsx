import type { Metadata } from 'next';
import { BookingWizard } from '@/features/booking/components/booking-wizard';
export const metadata: Metadata = { title: 'Plan Your Event' };
export default function Page() {
  return <BookingWizard />;
}
